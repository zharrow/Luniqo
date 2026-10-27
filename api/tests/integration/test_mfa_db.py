"""Second facteur de bout en bout sur PostgreSQL (LUN-006, ADR-004) : TOTP, codes de secours, obligation."""

import base64
import dataclasses
import os
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.pool import NullPool

from app.auth.dependencies import get_now
from app.auth.models import AuthEvent, AuthEventType, UserRole, UserSession
from app.config import get_settings
from app.main import app
from app.mfa import policy
from app.mfa.models import BackupCode, TotpFactor
from app.purge.service import purge
from tests.integration.conftest import API_DIR, login

pytestmark = pytest.mark.anyio

DIRECTION = "direction@a.test"
NURSERIES = "/api/v2/nurseries"


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
            "employee": await data.user("lea@a.test", UserRole.EMPLOYEE, a),
            "developer": await data.user("dev@luniqo.test", UserRole.DEVELOPER)}


def code(secret: bytes, clock: Clock, offset: int = 0) -> str:
    return policy.hotp(secret, policy.time_step(clock.now) + offset)


async def enable_totp(client, clock) -> tuple[bytes, list[str] | None]:
    """Active un TOTP depuis une session qui y est autorisée ; renvoie le secret et les codes de secours."""
    response = await client.post("/api/v2/auth/mfa/totp")
    assert response.status_code == 201, response.text
    secret = base64.b32decode(response.json()["secret"])
    response = await client.post("/api/v2/auth/mfa/totp/confirm", json={"code": code(secret, clock)})
    assert response.status_code == 200, response.text
    return secret, response.json()["backup_codes"]


async def owner_with_totp(clients, clock) -> tuple[bytes, list[str]]:
    """La direction se connecte pour la première fois et enregistre son TOTP."""
    first = clients()
    assert (await login(first, DIRECTION, complete_mfa=False)).json()["mfa"] == "setup_required"
    secret, codes = await enable_totp(first, clock)
    await first.post("/api/v2/auth/logout")
    clock.advance(seconds=30)  # le code de l'activation ne resservira pas
    return secret, codes


async def events(db, kind: AuthEventType) -> list[AuthEvent]:
    return list(await db.scalars(select(AuthEvent).where(AuthEvent.event == kind.value).order_by(AuthEvent.id)))


# --- Première connexion de la direction -----------------------------------------

@pytest.mark.parametrize("email", [DIRECTION, "dev@luniqo.test"])
async def test_premiere_connexion_ne_permet_que_d_enregistrer_un_facteur(clients, world, clock, email):
    client = clients()
    response = await login(client, email, complete_mfa=False)
    assert response.status_code == 200 and response.json()["mfa"] == "setup_required"
    assert (await client.get(NURSERIES)).status_code == 403
    assert (await client.get("/api/v2/auth/me")).json()["mfa"] == "setup_required"
    status_response = await client.get("/api/v2/auth/mfa")
    assert status_response.json() == {"state": "setup_required", "totp": None, "totp_setup_pending": False,
                                      "backup_codes_remaining": 0}


async def test_activation_du_totp_complete_la_session(clients, world, clock, db):
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    response = await client.post("/api/v2/auth/mfa/totp")
    assert response.status_code == 201 and response.headers["cache-control"] == "no-store"
    body = response.json()
    secret = base64.b32decode(body["secret"])
    assert body["otpauth_uri"].startswith("otpauth://totp/Luniqo:direction@a.test?secret=")

    # Un mauvais code ne confirme rien.
    wrong = await client.post("/api/v2/auth/mfa/totp/confirm", json={"code": code(secret, clock, offset=5)})
    assert wrong.status_code == 401
    assert (await client.get(NURSERIES)).status_code == 403

    response = await client.post("/api/v2/auth/mfa/totp/confirm", json={"code": code(secret, clock)})
    assert response.status_code == 200
    codes = response.json()["backup_codes"]
    assert len(codes) == 10 and len(set(codes)) == 10
    assert all(len(c) == 14 and c.count("-") == 2 for c in codes)
    assert (await client.get(NURSERIES)).status_code == 200
    assert (await client.get("/api/v2/auth/me")).json()["mfa"] == "verified"
    status_body = (await client.get("/api/v2/auth/mfa")).json()
    assert status_body["state"] == "verified" and status_body["totp"]["confirmed_at"]
    assert status_body["backup_codes_remaining"] == 10
    assert [e.detail for e in await events(db, AuthEventType.TOTP_ENABLED)] == [None]


async def test_secret_chiffre_et_codes_haches_en_base(clients, world, clock, db):
    secret, codes = await owner_with_totp(clients, clock)
    factor = await db.scalar(select(TotpFactor).where(TotpFactor.user_id == world["owner"].id))
    assert secret not in factor.secret_ciphertext
    assert base64.b32encode(secret) not in factor.secret_ciphertext
    stored = list(await db.scalars(select(BackupCode).where(BackupCode.user_id == world["owner"].id)))
    assert len(stored) == 10
    for row in stored:
        assert row.code_hash.startswith("$argon2id$")
        assert all(c.replace("-", "")[4:] not in row.code_hash for c in codes)


async def test_journal_sans_secret_ni_code(clients, world, clock, db):
    secret, codes = await owner_with_totp(clients, clock)
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    await client.post("/api/v2/auth/mfa/verify", json={"code": "000000"})
    await client.post("/api/v2/auth/mfa/verify", json={"code": codes[0]})
    secret_b32 = base64.b32encode(secret).decode().rstrip("=")
    for event in await db.scalars(select(AuthEvent)):
        values = " ".join(str(value) for value in vars(event).values())
        assert secret_b32 not in values and codes[0] not in values and codes[0].replace("-", "") not in values


async def test_session_en_attente_ne_peut_pas_ajouter_son_propre_totp(clients, world, clock):
    """Avec le seul mot de passe, un attaquant ne contourne pas le TOTP en enregistrant le sien."""
    await owner_with_totp(clients, clock)
    attacker = clients()
    assert (await login(attacker, DIRECTION, complete_mfa=False)).json()["mfa"] == "required"
    response = await attacker.post("/api/v2/auth/mfa/totp")
    assert response.status_code == 403
    assert response.json()["detail"] == "Présentez d'abord votre second facteur"
    assert (await attacker.post("/api/v2/auth/mfa/backup-codes")).status_code == 403
    assert (await attacker.delete("/api/v2/auth/mfa/totp")).status_code == 403


# --- Connexions suivantes ----------------------------------------------------------

async def test_connexion_avec_le_code_totp(clients, world, clock, db):
    secret, _ = await owner_with_totp(clients, clock)
    client = clients()
    assert (await login(client, DIRECTION, complete_mfa=False)).json()["mfa"] == "required"
    assert (await client.get(NURSERIES)).status_code == 403
    response = await client.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})
    assert response.status_code == 200 and response.json()["mfa"] == "verified"
    assert (await client.get(NURSERIES)).status_code == 200
    assert [e.detail for e in await events(db, AuthEventType.MFA_SUCCEEDED)] == ["totp"]


async def test_code_totp_rejoue_refuse(clients, world, clock, db):
    secret, _ = await owner_with_totp(clients, clock)
    first, second = clients(), clients()
    await login(first, DIRECTION, complete_mfa=False)
    await login(second, DIRECTION, complete_mfa=False)
    used = code(secret, clock)
    assert (await first.post("/api/v2/auth/mfa/verify", json={"code": used})).status_code == 200
    # Le même code, intercepté et présenté aussitôt dans une autre session.
    assert (await second.post("/api/v2/auth/mfa/verify", json={"code": used})).status_code == 401
    assert (await second.get(NURSERIES)).status_code == 403
    assert [e.detail for e in await events(db, AuthEventType.MFA_FAILED)] == ["replay"]


async def test_code_de_secours_utilisable_une_seule_fois(clients, world, clock):
    _, codes = await owner_with_totp(clients, clock)
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    typed = codes[3].lower().replace("-", " ")  # saisie approximative tolérée
    assert (await client.post("/api/v2/auth/mfa/verify", json={"code": typed})).status_code == 200
    assert (await client.get("/api/v2/auth/mfa")).json()["backup_codes_remaining"] == 9

    again = clients()
    await login(again, DIRECTION, complete_mfa=False)
    assert (await again.post("/api/v2/auth/mfa/verify", json={"code": codes[3]})).status_code == 401


@pytest.mark.parametrize("wrong", ["ABCD-EFGH-JKMN", "pas un code", "1234567"])
async def test_code_de_secours_inconnu_ou_mal_forme_refuse(clients, world, clock, wrong):
    await owner_with_totp(clients, clock)
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    assert (await client.post("/api/v2/auth/mfa/verify", json={"code": wrong})).status_code == 401


async def test_verification_sans_objet_sur_une_session_complete(clients, world, clock):
    secret, _ = await owner_with_totp(clients, clock)
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    await client.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})
    clock.advance(seconds=30)
    assert (await client.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})).status_code == 409


async def test_sans_session_les_routes_du_second_facteur_refusent(clients, world):
    client = clients()
    assert (await client.get("/api/v2/auth/mfa")).status_code == 401
    assert (await client.post("/api/v2/auth/mfa/verify", json={"code": "123456"})).status_code == 401


# --- Limitation des tentatives --------------------------------------------------

async def test_delai_puis_blocage_apres_des_echecs(clients, world, clock, db):
    secret, _ = await owner_with_totp(clients, clock)
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    for _ in range(5):
        assert (await client.post("/api/v2/auth/mfa/verify", json={"code": "000000"})).status_code == 401
    # Même le bon code attend : le délai est vérifié avant le code.
    response = await client.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})
    assert response.status_code == 429 and response.headers["retry-after"] == "1"
    clock.advance(seconds=1)
    assert (await client.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})).status_code == 200
    assert len(await events(db, AuthEventType.MFA_THROTTLED)) == 1


async def totp_factor(db, user) -> TotpFactor:
    return await db.scalar(select(TotpFactor).where(TotpFactor.user_id == user.id,
                                                    TotpFactor.confirmed_at.is_not(None)))


async def test_echecs_comptes_sur_le_facteur_et_remis_a_zero_par_une_reussite(clients, world, clock, db):
    secret, codes = await owner_with_totp(clients, clock)
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    for wrong in ("000000", "ABCD-EFGH-JKMN", "pas-un-code"):
        assert (await client.post("/api/v2/auth/mfa/verify", json={"code": wrong})).status_code == 401
    factor = await totp_factor(db, world["owner"])
    await db.refresh(factor)
    assert factor.failed_attempts == 3
    assert (await client.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})).status_code == 200
    await db.refresh(factor)
    assert factor.failed_attempts == 0


async def test_totp_bloque_au_100e_echec_consecutif_debloque_par_un_code_de_secours(clients, world, clock, db):
    secret, codes = await owner_with_totp(clients, clock)
    # 99 échecs déjà comptés, étalés sur des semaines : la limitation par
    # fenêtre de 15 minutes ne les a pas arrêtés.
    factor = await totp_factor(db, world["owner"])
    factor.failed_attempts = 99
    await db.flush()
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    assert (await client.post("/api/v2/auth/mfa/verify", json={"code": "000000"})).status_code == 401
    response = await client.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})
    assert response.status_code == 403 and "code de secours" in response.json()["detail"]
    assert (await client.post("/api/v2/auth/mfa/verify", json={"code": codes[0]})).status_code == 200

    clock.advance(seconds=30)
    later = clients()
    await login(later, DIRECTION, complete_mfa=False)
    assert (await later.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})).status_code == 200


async def test_la_purge_du_journal_ne_debloque_pas_le_totp(clients, world, clock, db):
    """Des échecs vieux de plus de 6 mois restent consécutifs (NIST) : le blocage ne dépend pas du journal."""
    secret, _ = await owner_with_totp(clients, clock)
    factor = await totp_factor(db, world["owner"])
    factor.failed_attempts = policy.MAX_CONSECUTIVE_FAILURES
    await db.flush()
    clock.advance(days=200)
    report = await purge(db, clock.now)
    assert report.auth_events > 0
    assert await db.scalar(select(func.count()).select_from(AuthEvent)) == 0

    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    response = await client.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})
    assert response.status_code == 403 and "code de secours" in response.json()["detail"]


# --- Changer, retirer, régénérer -------------------------------------------------

async def test_changement_de_telephone_ferme_les_autres_sessions(clients, world, clock, db):
    old_secret, codes = await owner_with_totp(clients, clock)
    desk, phone = clients(), clients()
    for client in (desk, phone):
        await login(client, DIRECTION, complete_mfa=False)
        await client.post("/api/v2/auth/mfa/verify", json={"code": code(old_secret, clock)})
        clock.advance(seconds=30)
    new_secret, new_codes = await enable_totp(desk, clock)
    assert new_codes is None  # les codes de secours existants restent valables
    assert (await phone.get(NURSERIES)).status_code == 401
    assert (await desk.get(NURSERIES)).status_code == 200
    assert await db.scalar(select(func.count()).select_from(TotpFactor)
                           .where(TotpFactor.user_id == world["owner"].id)) == 1
    assert [e.detail for e in await events(db, AuthEventType.TOTP_ENABLED)] == [None, "replaced"]

    clock.advance(seconds=30)
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    assert (await client.post("/api/v2/auth/mfa/verify", json={"code": code(old_secret, clock)})).status_code == 401
    assert (await client.post("/api/v2/auth/mfa/verify", json={"code": code(new_secret, clock)})).status_code == 200


async def test_gestion_des_facteurs_exige_une_authentification_recente(clients, world, clock):
    secret, _ = await owner_with_totp(clients, clock)
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    await client.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})
    clock.advance(minutes=14)
    assert (await client.get(NURSERIES)).status_code == 200  # activité : la session reste ouverte
    clock.advance(minutes=2)
    for response in (await client.post("/api/v2/auth/mfa/totp"), await client.post("/api/v2/auth/mfa/backup-codes")):
        assert response.status_code == 403
        assert response.json()["detail"].startswith("Reconnectez-vous")


async def test_la_direction_ne_peut_pas_retirer_son_seul_facteur(clients, world, clock):
    await owner_with_totp(clients, clock)
    client = clients()
    await login(client, DIRECTION)
    response = await client.delete("/api/v2/auth/mfa/totp")
    assert response.status_code == 409 and "obligatoire" in response.json()["detail"]


async def test_employe_active_puis_retire_un_totp_facultatif(clients, world, clock, db):
    client = clients()
    assert (await login(client, "lea@a.test", complete_mfa=False)).json()["mfa"] == "not_required"
    secret, codes = await enable_totp(client, clock)
    assert len(codes) == 10
    clock.advance(seconds=30)

    other = clients()
    assert (await login(other, "lea@a.test", complete_mfa=False)).json()["mfa"] == "required"
    assert (await other.get(NURSERIES)).status_code == 403
    await other.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})

    assert (await other.delete("/api/v2/auth/mfa/totp")).status_code == 204
    assert (await client.get(NURSERIES)).status_code == 401  # autres sessions fermées
    assert await db.scalar(select(func.count()).select_from(BackupCode)
                           .where(BackupCode.user_id == world["employee"].id)) == 0
    third = clients()
    assert (await login(third, "lea@a.test", complete_mfa=False)).json()["mfa"] == "not_required"
    assert len(await events(db, AuthEventType.TOTP_REMOVED)) == 1


async def test_nouveaux_codes_de_secours_annulent_les_anciens(clients, world, clock):
    secret, old_codes = await owner_with_totp(clients, clock)
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    await client.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})
    response = await client.post("/api/v2/auth/mfa/backup-codes")
    assert response.status_code == 200
    new_codes = response.json()["backup_codes"]
    assert len(new_codes) == 10 and not set(new_codes) & set(old_codes)

    for typed, expected in ((old_codes[0], 401), (new_codes[0], 200)):
        other = clients()
        await login(other, DIRECTION, complete_mfa=False)
        assert (await other.post("/api/v2/auth/mfa/verify", json={"code": typed})).status_code == expected


async def test_confirmation_sans_activation_en_cours(clients, world, clock):
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    response = await client.post("/api/v2/auth/mfa/totp/confirm", json={"code": "123456"})
    assert response.status_code == 409


# --- Configuration ------------------------------------------------------------------

async def test_sans_cle_de_chiffrement_le_second_facteur_est_indisponible(clients, world, clock, monkeypatch):
    settings = dataclasses.replace(get_settings(), mfa_key=None)
    monkeypatch.setattr("app.mfa.router.get_settings", lambda: settings)
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    assert (await client.post("/api/v2/auth/mfa/totp")).status_code == 503


async def test_cle_changee_le_secret_ne_se_dechiffre_plus(clients, world, clock, monkeypatch):
    secret, _ = await owner_with_totp(clients, clock)
    settings = dataclasses.replace(get_settings(), mfa_key=bytes(32))
    monkeypatch.setattr("app.mfa.router.get_settings", lambda: settings)
    client = clients()
    await login(client, DIRECTION, complete_mfa=False)
    response = await client.post("/api/v2/auth/mfa/verify", json={"code": code(secret, clock)})
    assert response.status_code == 503
    assert (await client.get(NURSERIES)).status_code == 403


async def test_sessions_anterieures_a_la_migration_sans_second_facteur_exige(db, world):
    # Valeur par défaut de la colonne : les sessions ouvertes avant la 0008 ne sont pas bloquées.
    session = UserSession(token_digest=bytes(32), user_id=world["owner"].id)
    db.add(session)
    await db.flush()
    await db.refresh(session)
    assert session.mfa_required is False and session.mfa_verified_at is None


def test_migration_0012_reprend_les_echecs_du_journal(database_url):
    """Un TOTP bloqué avant la 0012 (échecs comptés dans le journal) le reste après."""
    alembic = Config(os.path.join(API_DIR, "alembic.ini"))
    engine = create_engine(database_url, poolclass=NullPool)
    enterprise, blocked, recovered, pending = (uuid.uuid4() for _ in range(4))
    command.downgrade(alembic, "0011")
    try:
        with engine.begin() as connection:
            connection.execute(text("INSERT INTO enterprise (id, name) VALUES (:id, 'Migration')"), {"id": enterprise})
            for user in (blocked, recovered, pending):
                connection.execute(text(
                    "INSERT INTO app_user (id, email, first_name, last_name, role, enterprise_id) "
                    "VALUES (:id, :email, 'M', 'M', 'owner', :enterprise)"),
                    {"id": user, "email": f"{user}@migration.test", "enterprise": enterprise})
                connection.execute(text(
                    "INSERT INTO totp_factor (user_id, secret_ciphertext, confirmed_at) "
                    "VALUES (:user, '\\x00', :confirmed_at)"),
                    {"user": user, "confirmed_at": None if user == pending else datetime.now(UTC)})

            def event(user, kind, days_ago):
                connection.execute(text(
                    "INSERT INTO auth_event (user_id, event, occurred_at) "
                    "VALUES (:user, :kind, now() - make_interval(days => :days))"),
                    {"user": user, "kind": kind, "days": days_ago})

            # Aucune réussite : tous les échecs comptent.
            for day in range(100):
                event(blocked, "mfa_failed", day + 1)
            # Échecs avant la dernière réussite oubliés, 2 après.
            for day in (9, 8, 1, 0):
                event(recovered, "mfa_failed", day)
            event(recovered, "mfa_succeeded", 5)
            event(pending, "mfa_failed", 1)
        command.upgrade(alembic, "head")
        with engine.connect() as connection:
            counts = dict(connection.execute(text(
                "SELECT user_id, failed_attempts FROM totp_factor WHERE user_id IN (:a, :b, :c)"),
                {"a": blocked, "b": recovered, "c": pending}).all())
        assert counts == {blocked: 100, recovered: 2, pending: 0}
    finally:
        command.upgrade(alembic, "head")
        with engine.begin() as connection:
            connection.execute(text("DELETE FROM auth_event WHERE user_id IN (:a, :b, :c)"),
                               {"a": blocked, "b": recovered, "c": pending})
            connection.execute(text("DELETE FROM app_user WHERE enterprise_id = :id"), {"id": enterprise})
            connection.execute(text("DELETE FROM enterprise WHERE id = :id"), {"id": enterprise})
        engine.dispose()
