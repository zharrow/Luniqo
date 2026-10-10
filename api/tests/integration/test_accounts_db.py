"""Comptes des employés et mot de passe, sur PostgreSQL (LUN-55)."""

import pytest
from sqlalchemy import func, select

from app.auth.dependencies import get_now
from app.auth.models import AuthEvent, UserRole, UserSession
from app.main import app
from tests.auth.conftest import PASSWORD
from tests.integration.conftest import login
from tests.integration.test_tablets_db import PIN_HASH, Clock, enrolled_tablet, pin_login

pytestmark = pytest.mark.anyio

NEW_PASSWORD = "une toute autre phrase de passe"


@pytest.fixture
def clock():
    clock = Clock()

    async def override_now():
        return clock.now

    app.dependency_overrides[get_now] = override_now
    yield clock
    app.dependency_overrides.pop(get_now, None)


@pytest.fixture
async def world(data, clock):
    a, b = await data.enterprise("Groupe A"), await data.enterprise("Groupe B")
    w = {"a": a, "nord": await data.nursery(a, "Crèche Nord"),
         "owner": await data.user("direction@a.test", UserRole.OWNER, a),
         "owner_b": await data.user("direction@b.test", UserRole.OWNER, b),
         "lea": await data.user("lea@a.test", UserRole.EMPLOYEE, a),
         "parent_b": await data.user("parent@b.test", UserRole.GUARDIAN)}
    w["lea"].pin_hash = PIN_HASH
    await data.grant(w["lea"], w["nord"])
    return w


async def signed_in(clients, email, password=PASSWORD):
    client = clients()
    response = await login(client, email, password)
    assert response.status_code == 200, response.text
    return client


async def invite(owner, email="Nadia.Nouvelle@A.test", first_name="Nadia", last_name="Nouvelle"):
    response = await owner.post("/api/v2/staff", json={"email": email, "first_name": first_name,
                                                       "last_name": last_name})
    assert response.status_code == 201, response.text
    return response.json()


# --- Invitation -----------------------------------------------------------------------

async def test_la_direction_invite_un_employe_qui_choisit_son_mot_de_passe(clients, world):
    owner = await signed_in(clients, "direction@a.test")
    body = await invite(owner)
    employee = body["employee"]
    assert employee | {"id": None} == {"id": None, "email": "nadia.nouvelle@a.test", "first_name": "Nadia",
                                       "last_name": "Nouvelle", "is_active": True, "has_password": False}
    assert len(body["token"]) >= 40
    # Le compte existe : il apparaît dans le personnel et peut recevoir un accès avant d'être activé…
    staff = {e["email"]: e for e in (await owner.get("/api/v2/staff")).json()}
    assert staff["nadia.nouvelle@a.test"]["has_password"] is False
    assert (await owner.put(f"/api/v2/nurseries/{world['nord'].id}/staff/{employee['id']}")).status_code == 204
    # … mais personne ne peut s'y connecter, quel que soit le mot de passe tenté.
    assert (await clients().post("/api/v2/auth/login", json={"email": "nadia.nouvelle@a.test",
                                                              "password": NEW_PASSWORD})).status_code == 401

    anonymous = clients()
    lookup = await anonymous.post("/api/v2/staff-invitations/lookup", json={"token": body["token"]})
    assert lookup.json() == {"first_name": "Nadia", "enterprise_name": "Groupe A", "email": "nadia.nouvelle@a.test"}
    # Mot de passe trop court : refusé, l'invitation reste valable.
    weak = await anonymous.post("/api/v2/staff-invitations/accept", json={"token": body["token"], "password": "court"})
    assert weak.status_code == 422
    accepted = await anonymous.post("/api/v2/staff-invitations/accept",
                                    json={"token": body["token"], "password": NEW_PASSWORD})
    assert accepted.status_code == 200 and accepted.json() == {"email": "nadia.nouvelle@a.test"}
    # Usage unique.
    for path in ("lookup", "accept"):
        again = await anonymous.post(f"/api/v2/staff-invitations/{path}",
                                     json={"token": body["token"], "password": NEW_PASSWORD})
        assert again.status_code == 404

    nadia = await signed_in(clients, "nadia.nouvelle@a.test", NEW_PASSWORD)
    assert [n["name"] for n in (await nadia.get("/api/v2/nurseries")).json()] == ["Crèche Nord"]
    assert (await owner.get("/api/v2/staff")).json()[0]["has_password"] is True


async def test_nouvelle_invitation_et_expiration(clients, world, clock):
    owner = await signed_in(clients, "direction@a.test")
    first = await invite(owner)
    url = f"/api/v2/staff/{first['employee']['id']}/invitation"
    second = (await owner.post(url)).json()
    anonymous = clients()
    # La nouvelle invitation annule la précédente.
    lookup = "/api/v2/staff-invitations/lookup"
    assert (await anonymous.post(lookup, json={"token": first["token"]})).status_code == 404
    assert (await anonymous.post(lookup, json={"token": second["token"]})).status_code == 200
    # Sept jours plus tard, elle a expiré.
    clock.advance(days=7)
    assert (await anonymous.post("/api/v2/staff-invitations/accept",
                                 json={"token": second["token"], "password": NEW_PASSWORD})).status_code == 404
    # Un compte déjà activé ne reçoit plus d'invitation.
    owner = await signed_in(clients, "direction@a.test")
    assert (await owner.post(f"/api/v2/staff/{world['lea'].id}/invitation")).status_code == 409


@pytest.mark.parametrize("email", ["lea@a.test", "LEA@A.TEST", "parent@b.test", "direction@b.test"])
async def test_adresse_deja_utilisee(clients, world, email):
    owner = await signed_in(clients, "direction@a.test")
    response = await owner.post("/api/v2/staff", json={"email": email, "first_name": "X", "last_name": "Y"})
    assert response.status_code == 409


async def test_droits_et_isolation(clients, world):
    owner = await signed_in(clients, "direction@a.test")
    invited = (await invite(owner))["employee"]["id"]
    employee = await signed_in(clients, "lea@a.test")
    assert (await employee.post("/api/v2/staff", json={"email": "x@a.test", "first_name": "X",
                                                       "last_name": "Y"})).status_code == 403
    assert (await employee.patch(f"/api/v2/staff/{invited}", json={"is_active": False})).status_code == 403
    other = await signed_in(clients, "direction@b.test")
    assert (await other.post(f"/api/v2/staff/{invited}/invitation")).status_code == 404
    assert (await other.patch(f"/api/v2/staff/{world['lea'].id}", json={"is_active": False})).status_code == 404
    # Un compte de direction ne passe pas pour un employé, même dans sa propre entreprise.
    assert (await owner.patch(f"/api/v2/staff/{world['owner'].id}", json={"is_active": False})).status_code == 404
    assert (await owner.post(f"/api/v2/staff/{world['owner'].id}/invitation")).status_code == 404
    # La direction de B crée ses employés dans B, jamais dans A.
    body = await invite(other, "recrue@b.test")
    staff_a = {e["email"] for e in (await owner.get("/api/v2/staff")).json()}
    assert "recrue@b.test" not in staff_a and body["employee"]["email"] == "recrue@b.test"


# --- Départ d'un salarié ------------------------------------------------------------------

async def test_desactiver_ferme_toutes_les_sessions(clients, world):
    owner = await signed_in(clients, "direction@a.test")
    web = await signed_in(clients, "lea@a.test")
    tablet, _ = await enrolled_tablet(clients, world)
    assert (await pin_login(tablet, world["lea"])).status_code == 201
    invited = await invite(owner)

    for user_id in (world["lea"].id, invited["employee"]["id"]):
        response = await owner.patch(f"/api/v2/staff/{user_id}", json={"is_active": False})
        assert response.status_code == 200 and response.json()["is_active"] is False
    assert (await web.get("/api/v2/auth/me")).status_code == 401
    assert (await tablet.get("/api/v2/tablet/children")).status_code == 401
    assert (await clients().post("/api/v2/auth/login", json={"email": "lea@a.test",
                                                              "password": PASSWORD})).status_code == 401
    # L'invitation en attente est annulée avec le compte, et ne revient pas à la réactivation.
    reactivated = await owner.patch(f"/api/v2/staff/{invited['employee']['id']}", json={"is_active": True})
    assert reactivated.status_code == 200
    assert (await clients().post("/api/v2/staff-invitations/lookup",
                                 json={"token": invited["token"]})).status_code == 404

    # Retour du salarié : il se reconnecte et retrouve ses crèches.
    assert (await owner.patch(f"/api/v2/staff/{world['lea'].id}", json={"is_active": True})).status_code == 200
    back = await signed_in(clients, "lea@a.test")
    assert [n["name"] for n in (await back.get("/api/v2/nurseries")).json()] == ["Crèche Nord"]


async def test_une_session_dormante_ne_revient_pas_a_la_reactivation(clients, world, db):
    """Sessions supprimées en base au départ (ADR-003) : sinon, une session restée inutilisée redeviendrait valable."""
    lea_id = world["lea"].id
    owner = await signed_in(clients, "direction@a.test")
    dormant = await signed_in(clients, "lea@a.test")
    assert (await owner.patch(f"/api/v2/staff/{lea_id}", json={"is_active": False})).status_code == 200
    assert await db.scalar(select(func.count()).select_from(UserSession).where(UserSession.user_id == lea_id)) == 0
    assert (await owner.patch(f"/api/v2/staff/{lea_id}", json={"is_active": True})).status_code == 200
    assert (await dormant.get("/api/v2/auth/me")).status_code == 401


async def test_corriger_le_nom(clients, world, db):
    owner = await signed_in(clients, "direction@a.test")
    url = f"/api/v2/staff/{world['lea'].id}"
    assert (await owner.patch(url, json={"last_name": "Martin"})).status_code == 200
    # Le test partage la session SQL de l'application : sans ceci, un commit oublié passerait inaperçu
    # (la modification non enregistrée resterait visible). On relit donc depuis la base.
    db.expire_all()
    assert {e["last_name"] for e in (await owner.get("/api/v2/staff")).json()} == {"Martin"}
    # is_active inchangé : le nouveau nom est quand même enregistré.
    assert (await owner.patch(url, json={"first_name": "Léa", "is_active": True})).status_code == 200
    staff = {e["email"]: e for e in (await owner.get("/api/v2/staff")).json()}
    assert (staff["lea@a.test"]["first_name"], staff["lea@a.test"]["last_name"]) == ("Léa", "Martin")
    assert (await owner.patch(url, json={"first_name": None})).status_code == 422


# --- Changement de mot de passe ------------------------------------------------------------

async def test_changer_son_mot_de_passe_ferme_les_autres_sessions(clients, world, db):
    current = await signed_in(clients, "lea@a.test")
    elsewhere = await signed_in(clients, "lea@a.test")
    tablet, _ = await enrolled_tablet(clients, world)
    assert (await pin_login(tablet, world["lea"])).status_code == 201

    url = "/api/v2/auth/me/password"
    weak = await current.put(url, json={"current_password": PASSWORD, "new_password": "court"})
    assert weak.status_code == 422
    response = await current.put(url, json={"current_password": PASSWORD, "new_password": NEW_PASSWORD})
    assert response.status_code == 200 and response.json() == {"other_sessions_closed": 2}

    assert (await current.get("/api/v2/auth/me")).status_code == 200
    assert (await elsewhere.get("/api/v2/auth/me")).status_code == 401
    assert (await tablet.get("/api/v2/tablet/children")).status_code == 401
    assert (await clients().post("/api/v2/auth/login", json={"email": "lea@a.test",
                                                              "password": PASSWORD})).status_code == 401
    await signed_in(clients, "lea@a.test", NEW_PASSWORD)
    events = set(await db.scalars(select(AuthEvent.detail).where(AuthEvent.user_id == world["lea"].id,
                                                                 AuthEvent.event == "sessions_revoked")))
    assert events == {"password_changed"}


async def test_mot_de_passe_actuel_exige_et_essais_limites(clients, world, clock):
    client = await signed_in(clients, "lea@a.test")
    url = "/api/v2/auth/me/password"
    for _ in range(5):
        response = await client.put(url, json={"current_password": "ce n'est pas le bon", "new_password": NEW_PASSWORD})
        assert response.status_code == 403
    # Bloqué, même avec le bon mot de passe, jusqu'à la fin de la fenêtre de 15 minutes.
    assert (await client.put(url, json={"current_password": PASSWORD, "new_password": NEW_PASSWORD})).status_code == 429
    clock.advance(minutes=15, seconds=1)
    client = await signed_in(clients, "lea@a.test")
    assert (await client.put(url, json={"current_password": PASSWORD, "new_password": NEW_PASSWORD})).status_code == 200


async def test_second_facteur_exige_avant_de_changer_de_mot_de_passe(clients, world):
    owner = clients()
    assert (await login(owner, "direction@a.test", complete_mfa=False)).json()["mfa"] == "setup_required"
    response = await owner.put("/api/v2/auth/me/password",
                               json={"current_password": PASSWORD, "new_password": NEW_PASSWORD})
    assert response.status_code == 403
    assert (await clients().put("/api/v2/auth/me/password",
                                json={"current_password": PASSWORD, "new_password": NEW_PASSWORD})).status_code == 401

