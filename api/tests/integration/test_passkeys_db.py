"""Passkeys de bout en bout sur PostgreSQL (LUN-69, ADR-004), avec un authentificateur simulé.

Enregistrement, second facteur, connexion sans mot de passe, retrait ; refus
d'une origine ou d'un domaine étrangers, d'une passkey sans vérification de
l'utilisateur, d'un défi rejoué ou expiré, d'un compteur qui recule, de la
passkey d'un autre compte.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.auth import policy as auth_policy
from app.auth.dependencies import get_now
from app.auth.models import AuthEvent, AuthEventType, UserRole
from app.main import app
from app.mfa.models import BackupCode
from app.passkeys import policy
from app.passkeys import router as passkeys_router
from app.passkeys.models import Passkey, WebauthnChallenge
from app.purge.service import purge
from tests.integration.conftest import WEB_COOKIE, login
from tests.integration.test_mfa_db import enable_totp
from tests.passkeys.authenticator import SoftAuthenticator, b64url

pytestmark = pytest.mark.anyio

DIRECTION = "direction@a.test"
EMPLOYEE = "lea@a.test"
NURSERIES = "/api/v2/nurseries"
PASSKEYS = "/api/v2/auth/passkeys"


class Clock:
    def __init__(self) -> None:
        self.now = datetime.now(UTC)

    def advance(self, **delta: float) -> None:
        self.now += timedelta(**delta)


@pytest.fixture
def clock():
    clock = Clock()

    async def override_now():
        return clock.now

    app.dependency_overrides[get_now] = override_now
    return clock


@pytest.fixture
async def world(data):
    a = await data.enterprise("Groupe A")
    return {"a": a, "owner": await data.user(DIRECTION, UserRole.OWNER, a),
            "employee": await data.user(EMPLOYEE, UserRole.EMPLOYEE, a)}


async def register(client, device: SoftAuthenticator, name: str = "iPhone de Camille", **kwargs):
    options = await client.post(f"{PASSKEYS}/registration/options")
    assert options.status_code == 200, options.text
    return await client.post(PASSKEYS, json={"name": name, "credential": device.create(options.json(), **kwargs)})


async def owner_with_passkey(clients, device: SoftAuthenticator) -> list[str]:
    """Première connexion de la direction : elle enregistre une passkey comme premier facteur."""
    first = clients()
    assert (await login(first, DIRECTION, complete_mfa=False)).json()["mfa"] == "setup_required"
    response = await register(first, device)
    assert response.status_code == 201, response.text
    await first.post("/api/v2/auth/logout")
    return response.json()["backup_codes"]


async def passkey_login(client, device: SoftAuthenticator, **kwargs):
    options = await client.post(f"{PASSKEYS}/login/options")
    assert options.status_code == 200, options.text
    return await client.post(f"{PASSKEYS}/login", json={"credential": device.get(options.json(), **kwargs)})


async def passkey_verify(client, device: SoftAuthenticator, **kwargs):
    options = await client.post(f"{PASSKEYS}/verify/options")
    assert options.status_code == 200, options.text
    return await client.post(f"{PASSKEYS}/verify", json={"credential": device.get(options.json(), **kwargs)})


async def events(db, kind: AuthEventType) -> list[AuthEvent]:
    return list(await db.scalars(select(AuthEvent).where(AuthEvent.event == kind.value).order_by(AuthEvent.id)))


async def stored(db, user) -> list[Passkey]:
    return list(await db.scalars(select(Passkey).where(Passkey.user_id == user.id)))


# --- Enregistrement ----------------------------------------------------------------

async def test_options_d_enregistrement(clients, world, clock):
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    response = await client.post(f"{PASSKEYS}/registration/options")
    assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
    options = response.json()
    assert options["rp"] == {"id": "localhost", "name": "Luniqo"}
    # Identifiant opaque du compte, sans son adresse.
    assert options["user"]["id"] == b64url(world["owner"].id.bytes)
    assert options["authenticatorSelection"]["residentKey"] == "required"
    assert options["authenticatorSelection"]["userVerification"] == "required"
    assert options["attestation"] == "none"
    assert options["timeout"] == 300_000
    assert options["excludeCredentials"] == []


async def test_premiere_passkey_complete_la_session_et_cree_les_codes_de_secours(clients, world, clock, db):
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    assert (await client.get(NURSERIES)).status_code == 403
    device = SoftAuthenticator()
    response = await register(client, device, name="  iPhone   de Camille ")
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["passkey"]["name"] == "iPhone de Camille" and body["passkey"]["last_used_at"] is None
    assert len(body["backup_codes"]) == 10
    assert (await client.get(NURSERIES)).status_code == 200
    assert (await client.get("/api/v2/auth/me")).json()["mfa"] == "verified"

    [passkey] = await stored(db, world["owner"])
    assert passkey.credential_id == device.credential_id and passkey.sign_count == 1
    assert passkey.aaguid == "00000000-0000-0000-0000-000000000000"
    # Clé publique seulement : la clé privée ne quitte pas l'appareil.
    assert passkey.public_key == device._cose_public_key()
    assert len(await events(db, AuthEventType.PASSKEY_ADDED)) == 1
    assert len(await events(db, AuthEventType.BACKUP_CODES_GENERATED)) == 1
    # Le défi a servi : il n'en reste aucun.
    assert await db.scalar(select(func.count()).select_from(WebauthnChallenge)) == 0


async def test_seconde_passkey_sans_nouveaux_codes_et_deja_exclue(clients, world, clock, db):
    phone = SoftAuthenticator()
    await owner_with_passkey(clients, phone)
    client = clients()
    assert (await passkey_login(client, phone)).status_code == 200
    options = (await client.post(f"{PASSKEYS}/registration/options")).json()
    assert [c["id"] for c in options["excludeCredentials"]] == [b64url(phone.credential_id)]
    laptop = SoftAuthenticator(synced=True)
    response = await client.post(PASSKEYS, json={"name": "Mac du bureau", "credential": laptop.create(options)})
    assert response.status_code == 201 and response.json()["backup_codes"] is None
    listing = (await client.get(PASSKEYS)).json()
    assert [(p["name"], p["backed_up"]) for p in listing] == [("iPhone de Camille", False), ("Mac du bureau", True)]


@pytest.mark.parametrize("bad", [
    {"user_verified": False},
    {"origin": "https://luniqo.attaquant.test"},
    {"rp_id": "attaquant.test"},
])
async def test_enregistrement_refuse(clients, world, clock, db, bad):
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    options = (await client.post(f"{PASSKEYS}/registration/options")).json()
    credential = SoftAuthenticator().create(options, **bad)
    response = await client.post(PASSKEYS, json={"name": "Téléphone", "credential": credential})
    assert response.status_code == 400 and response.json()["detail"] == "Passkey refusée"
    assert await stored(db, world["owner"]) == []
    assert (await client.get(NURSERIES)).status_code == 403
    # Le défi est consommé même par un échec.
    again = await client.post(PASSKEYS, json={"name": "Téléphone", "credential": credential})
    assert again.status_code == 409


async def test_defi_lie_a_la_session(clients, world, clock, db):
    # Deux enregistrements en parallèle (direction et employé) : chacun garde son défi.
    owner, employee = clients(), clients()
    await login(owner, DIRECTION, complete_mfa=False)
    await login(employee, EMPLOYEE)
    owner_options = (await owner.post(f"{PASSKEYS}/registration/options")).json()
    employee_options = (await employee.post(f"{PASSKEYS}/registration/options")).json()
    assert owner_options["challenge"] != employee_options["challenge"]
    for client, options in ((employee, employee_options), (owner, owner_options)):
        response = await client.post(PASSKEYS, json={"name": "Téléphone",
                                                     "credential": SoftAuthenticator().create(options)})
        assert response.status_code == 201, response.text
    # Le défi d'une autre session ne sert pas.
    stolen = SoftAuthenticator().create(owner_options)
    assert (await employee.post(PASSKEYS, json={"name": "Volé", "credential": stolen})).status_code == 409


async def test_enregistrement_sans_defi_ou_hors_delai(clients, world, clock):
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    credential = SoftAuthenticator().create({"challenge": b64url(b"x" * 32), "rp": {"id": "localhost"},
                                             "user": {"id": b64url(world["owner"].id.bytes)}})
    assert (await client.post(PASSKEYS, json={"name": "Téléphone", "credential": credential})).status_code == 409
    options = (await client.post(f"{PASSKEYS}/registration/options")).json()
    clock.advance(minutes=5)
    late = await client.post(PASSKEYS, json={"name": "Téléphone", "credential": SoftAuthenticator().create(options)})
    assert late.status_code == 409


async def test_meme_passkey_pas_enregistree_deux_fois(clients, world, clock, db):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    await passkey_login(client, device)
    assert (await register(client, device)).status_code == 409
    # Ni sur un autre compte.
    employee = clients()
    await login(employee, EMPLOYEE)
    assert (await register(employee, device)).status_code == 409
    assert await stored(db, world["employee"]) == []


async def test_nombre_de_passkeys_limite(clients, world, clock, db):
    client = clients()
    await login(client, EMPLOYEE)
    for index in range(policy.MAX_PASSKEYS_PER_USER):
        assert (await register(client, SoftAuthenticator(), name=f"Appareil {index}")).status_code == 201
    assert (await client.post(f"{PASSKEYS}/registration/options")).status_code == 409


@pytest.mark.parametrize("name", ["", "   ", "x" * 65])
async def test_nom_invalide(clients, world, clock, name):
    client = clients()
    await login(client, EMPLOYEE)
    assert (await register(client, SoftAuthenticator(), name=name)).status_code == 422


async def test_mot_de_passe_seul_ne_permet_pas_d_ajouter_une_passkey(clients, world, clock):
    await owner_with_passkey(clients, SoftAuthenticator())
    client = clients()
    assert (await login(client, DIRECTION, complete_mfa=False)).json()["mfa"] == "required"
    # Sinon le mot de passe seul suffirait à contourner la première passkey.
    assert (await client.post(f"{PASSKEYS}/registration/options")).status_code == 403
    assert (await client.get(PASSKEYS)).status_code == 403


async def test_gestion_exige_une_authentification_recente(clients, world, clock):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    await passkey_login(client, device)
    clock.advance(minutes=16)
    response = await client.post(f"{PASSKEYS}/registration/options")
    assert response.status_code == 403 and "Reconnectez-vous" in response.json()["detail"]


async def test_enregistrement_ferme_les_autres_sessions(clients, world, clock, db):
    other = clients()
    await login(other, EMPLOYEE)
    client = clients()
    await login(client, EMPLOYEE)
    assert (await register(client, SoftAuthenticator())).status_code == 201
    assert (await other.get("/api/v2/auth/me")).status_code == 401
    assert (await client.get("/api/v2/auth/me")).status_code == 200


# --- Second facteur ----------------------------------------------------------------

async def test_passkey_en_second_facteur(clients, world, clock, db):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    assert (await login(client, DIRECTION, complete_mfa=False)).json()["mfa"] == "required"
    options = (await client.post(f"{PASSKEYS}/verify/options")).json()
    assert options["rpId"] == "localhost" and options["userVerification"] == "required"
    assert [c["id"] for c in options["allowCredentials"]] == [b64url(device.credential_id)]
    response = await client.post(f"{PASSKEYS}/verify", json={"credential": device.get(options)})
    assert response.status_code == 200 and response.json()["mfa"] == "verified"
    assert (await client.get(NURSERIES)).status_code == 200
    assert [e.detail for e in await events(db, AuthEventType.MFA_SUCCEEDED)] == ["passkey"]
    [passkey] = await stored(db, world["owner"])
    assert passkey.sign_count == 2 and passkey.last_used_at == clock.now


async def test_passkey_d_un_autre_compte_refusee_en_second_facteur(clients, world, clock, db):
    await owner_with_passkey(clients, SoftAuthenticator())
    employee_device = SoftAuthenticator()
    employee = clients()
    await login(employee, EMPLOYEE)
    assert (await register(employee, employee_device)).status_code == 201

    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    response = await passkey_verify(client, employee_device)
    assert response.status_code == 401
    assert (await client.get(NURSERIES)).status_code == 403
    assert [e.detail for e in await events(db, AuthEventType.MFA_FAILED)] == ["passkey"]


async def test_verification_sans_objet(clients, world, clock):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    await passkey_login(client, device)
    assert (await client.post(f"{PASSKEYS}/verify/options")).status_code == 409
    # Compte qui n'a qu'un TOTP : pas d'options de passkey.
    employee = clients()
    await login(employee, EMPLOYEE)
    await enable_totp(employee, clock)
    other = clients()
    await login(other, EMPLOYEE, complete_mfa=False)
    response = await other.post(f"{PASSKEYS}/verify/options")
    assert response.status_code == 409 and response.json()["detail"] == "Aucune passkey enregistrée pour ce compte"


async def test_echecs_de_passkey_limites_comme_le_totp(clients, world, clock, db):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    for _ in range(auth_policy.ACCOUNT_THROTTLE.delay_from):
        assert (await passkey_verify(client, device, user_verified=False)).status_code == 401
    response = await passkey_verify(client, device)
    assert response.status_code == 429 and int(response.headers["retry-after"]) > 0


# --- Connexion sans mot de passe ------------------------------------------------------

async def test_connexion_sans_mot_de_passe(clients, world, clock, db):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    options = (await client.post(f"{PASSKEYS}/login/options")).json()
    # Aucun compte désigné : le navigateur propose les passkeys de l'appareil.
    assert options.get("allowCredentials", []) == [] and options["userVerification"] == "required"
    response = await client.post(f"{PASSKEYS}/login", json={"credential": device.get(options)})
    assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
    assert response.json()["email"] == DIRECTION and response.json()["mfa"] == "verified"
    assert WEB_COOKIE in client.cookies
    assert (await client.get(NURSERIES)).status_code == 200
    succeeded = await events(db, AuthEventType.LOGIN_SUCCEEDED)
    assert succeeded[-1].detail == "passkey" and succeeded[-1].user_id == world["owner"].id


async def test_connexion_remplace_la_session_precedente_du_navigateur(clients, world, clock, db):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    await login(client, EMPLOYEE)
    previous = client.cookies[WEB_COOKIE]
    assert (await passkey_login(client, device)).status_code == 200
    assert client.cookies[WEB_COOKIE] != previous
    assert (await client.get("/api/v2/auth/me")).json()["email"] == DIRECTION


async def test_passkey_synchronisee_compteur_toujours_a_zero(clients, world, clock):
    device = SoftAuthenticator(synced=True)
    await owner_with_passkey(clients, device)
    for _ in range(3):
        assert (await passkey_login(clients(), device)).status_code == 200


@pytest.mark.parametrize("bad", [
    {"user_verified": False},
    {"origin": "https://luniqo.attaquant.test"},
    {"rp_id": "attaquant.test"},
    {"user_handle": uuid.uuid4().bytes},
])
async def test_connexion_refusee(clients, world, clock, db, bad):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    response = await passkey_login(client, device, **bad)
    assert response.status_code == 401 and WEB_COOKIE not in client.cookies
    failed = await events(db, AuthEventType.LOGIN_FAILED)
    assert [e.detail for e in failed] == ["passkey"]


async def test_passkey_inconnue_refusee(clients, world, clock, db):
    response = await passkey_login(clients(), SoftAuthenticator())
    assert response.status_code == 401
    assert [(e.detail, e.user_id) for e in await events(db, AuthEventType.LOGIN_FAILED)] == [("passkey", None)]


async def test_defi_de_connexion_a_usage_unique(clients, world, clock):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    options = (await client.post(f"{PASSKEYS}/login/options")).json()
    assert (await client.post(f"{PASSKEYS}/login", json={"credential": device.get(options)})).status_code == 200
    # Même défi, nouvelle signature valable : refusé, le défi a servi.
    assert (await client.post(f"{PASSKEYS}/login", json={"credential": device.get(options)})).status_code == 401


async def test_defi_de_connexion_expire_apres_5_minutes(clients, world, clock):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    options = (await client.post(f"{PASSKEYS}/login/options")).json()
    clock.advance(minutes=5)
    assert (await client.post(f"{PASSKEYS}/login", json={"credential": device.get(options)})).status_code == 401


async def test_compteur_qui_recule_refuse(clients, world, clock, db):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    assert (await passkey_login(clients(), device)).status_code == 200  # compteur à 2
    # Une copie de la passkey signerait avec un compteur déjà vu.
    assert (await passkey_login(clients(), device, sign_count=2)).status_code == 401
    [passkey] = await stored(db, world["owner"])
    assert passkey.sign_count == 2


async def test_compte_desactive_ne_se_connecte_pas(clients, world, clock, db):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    world["owner"].is_active = False
    await db.flush()
    assert (await passkey_login(clients(), device)).status_code == 401
    assert [e.detail for e in await events(db, AuthEventType.LOGIN_FAILED)] == ["inactive_account"]


@pytest.mark.parametrize("credential", [{}, {"id": "x"}, {"id": "x", "rawId": "!!", "response": {}}])
async def test_reponse_mal_formee(clients, world, clock, credential):
    client = clients()
    await client.post(f"{PASSKEYS}/login/options")
    assert (await client.post(f"{PASSKEYS}/login", json={"credential": credential})).status_code == 401


async def test_defis_de_connexion_limites_par_adresse_ip(clients, world, clock):
    client = clients()
    for _ in range(policy.MAX_PENDING_LOGIN_CHALLENGES_PER_IP):
        assert (await client.post(f"{PASSKEYS}/login/options")).status_code == 200
    response = await client.post(f"{PASSKEYS}/login/options")
    assert response.status_code == 429 and 0 < int(response.headers["retry-after"]) <= 300
    clock.advance(minutes=5)
    assert (await client.post(f"{PASSKEYS}/login/options")).status_code == 200


async def test_echecs_de_connexion_limites_par_adresse_ip(clients, world, clock, db):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    for _ in range(30):
        db.add(AuthEvent(occurred_at=clock.now, event=AuthEventType.LOGIN_FAILED.value, ip="127.0.0.1"))
    await db.flush()
    response = await passkey_login(clients(), device)
    assert response.status_code == 429
    assert [e.detail for e in await events(db, AuthEventType.LOGIN_THROTTLED)] == ["passkey"]


# --- Renommer, retirer ---------------------------------------------------------------

async def test_renommer(clients, world, clock, db):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    await passkey_login(client, device)
    [passkey] = await stored(db, world["owner"])
    response = await client.patch(f"{PASSKEYS}/{passkey.id}", json={"name": "Ancien iPhone"})
    assert response.status_code == 200 and response.json()["name"] == "Ancien iPhone"
    # La passkey d'un autre compte est introuvable.
    employee = clients()
    await login(employee, EMPLOYEE)
    assert (await employee.patch(f"{PASSKEYS}/{passkey.id}", json={"name": "À moi"})).status_code == 404
    assert (await employee.delete(f"{PASSKEYS}/{passkey.id}")).status_code == 404
    await db.refresh(passkey)
    assert passkey.name == "Ancien iPhone"


async def test_la_direction_ne_peut_pas_retirer_son_seul_facteur(clients, world, clock, db):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    await passkey_login(client, device)
    [passkey] = await stored(db, world["owner"])
    assert (await client.delete(f"{PASSKEYS}/{passkey.id}")).status_code == 409
    # Avec un TOTP en plus, la passkey peut partir ; les codes de secours restent.
    await enable_totp(client, clock)
    assert (await client.delete(f"{PASSKEYS}/{passkey.id}")).status_code == 204
    assert await stored(db, world["owner"]) == []
    assert await db.scalar(select(func.count()).select_from(BackupCode).where(
        BackupCode.user_id == world["owner"].id)) == 10
    assert len(await events(db, AuthEventType.PASSKEY_REMOVED)) == 1


async def test_totp_retirable_si_une_passkey_reste(clients, world, clock, db):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    client = clients()
    await passkey_login(client, device)
    await enable_totp(client, clock)
    assert (await client.delete("/api/v2/auth/mfa/totp")).status_code == 204
    assert await db.scalar(select(func.count()).select_from(BackupCode).where(
        BackupCode.user_id == world["owner"].id)) == 10


async def test_employe_retire_sa_seule_passkey(clients, world, clock, db):
    client = clients()
    await login(client, EMPLOYEE)
    await register(client, SoftAuthenticator())
    other = clients()
    await login(other, EMPLOYEE, complete_mfa=False)
    [passkey] = await stored(db, world["employee"])
    assert (await client.delete(f"{PASSKEYS}/{passkey.id}")).status_code == 204
    # Sans facteur, plus de codes de secours ; les autres sessions sont fermées.
    assert await db.scalar(select(func.count()).select_from(BackupCode).where(
        BackupCode.user_id == world["employee"].id)) == 0
    assert (await other.get("/api/v2/auth/me")).status_code == 401
    # La connexion suivante n'exige plus de second facteur.
    assert (await login(clients(), EMPLOYEE, complete_mfa=False)).json()["mfa"] == "not_required"


async def test_codes_de_secours_regeneres_avec_une_passkey_seule(clients, world, clock):
    device = SoftAuthenticator()
    old_codes = await owner_with_passkey(clients, device)
    client = clients()
    await passkey_login(client, device)
    response = await client.post("/api/v2/auth/mfa/backup-codes")
    assert response.status_code == 200 and set(response.json()["backup_codes"]).isdisjoint(old_codes)


async def test_code_de_secours_en_second_facteur_avec_une_passkey_seule(clients, world, clock):
    codes = await owner_with_passkey(clients, SoftAuthenticator())
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    response = await client.post("/api/v2/auth/mfa/verify", json={"code": codes[0]})
    assert response.status_code == 200 and response.json()["mfa"] == "verified"
    assert (await client.get("/api/v2/auth/mfa")).json()["state"] == "verified"


# --- Divers ----------------------------------------------------------------------------

async def test_sans_session_les_routes_de_gestion_refusent(clients, world):
    client = clients()
    assert (await client.get(PASSKEYS)).status_code == 401
    assert (await client.post(f"{PASSKEYS}/registration/options")).status_code == 401
    assert (await client.post(f"{PASSKEYS}/verify/options")).status_code == 401
    assert (await client.delete(f"{PASSKEYS}/{uuid.uuid4()}")).status_code == 401


async def test_sans_origine_configuree_les_passkeys_sont_indisponibles(clients, world, monkeypatch):
    monkeypatch.setattr(passkeys_router, "_rp", lambda: None)
    assert (await clients().post(f"{PASSKEYS}/login/options")).status_code == 503


async def test_journal_sans_defi_ni_identifiant_de_passkey(clients, world, clock, db):
    device = SoftAuthenticator()
    await owner_with_passkey(clients, device)
    await passkey_login(clients(), device)
    await passkey_login(clients(), device, user_verified=False)
    secrets = {b64url(device.credential_id), device.credential_id.hex()}
    for event in await db.scalars(select(AuthEvent)):
        assert not any(secret in (event.detail or "") for secret in secrets)


async def test_purge_des_defis_expires(clients, world, clock, db):
    client = clients()
    await client.post(f"{PASSKEYS}/login/options")
    await client.post(f"{PASSKEYS}/login/options")
    assert (await purge(db, clock.now)).webauthn_challenges == 0
    assert (await purge(db, clock.now + policy.TIMEOUT)).webauthn_challenges == 2
