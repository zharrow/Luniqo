"""Comptes familles et consultation par les parents sur PostgreSQL (LUN-011)."""

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import select

from app.attendance.models import Attendance
from app.auth.dependencies import get_now
from app.auth.models import AppUser, AuthEvent, UserRole
from app.children.models import Child, ChildGuardian, ChildStatus, Family, Guardian, Relationship
from app.main import app
from tests.auth.conftest import PASSWORD
from tests.integration.conftest import login

pytestmark = pytest.mark.anyio

NOW = datetime(2026, 7, 15, 14, 0, tzinfo=UTC)  # 16 h à Paris
PARENT_PASSWORD = "le petit train de la crèche"


@pytest.fixture
def clock():
    state = {"now": NOW}

    async def override_now():
        return state["now"]

    app.dependency_overrides[get_now] = override_now
    return state


@pytest.fixture
async def world(data, db):
    a, b = await data.enterprise("Groupe A"), await data.enterprise("Groupe B")
    w = {"nord": await data.nursery(a, "Crèche Nord"), "sud": await data.nursery(a, "Crèche Sud"),
         "owner": await data.user("direction@a.test", UserRole.OWNER, a),
         "employee": await data.user("employe@a.test", UserRole.EMPLOYEE, a),
         "owner_b": await data.user("direction@b.test", UserRole.OWNER, b)}
    await data.grant(w["employee"], w["nord"])

    async def family(nursery, label, kids, adults):
        fam = Family(id=uuid.uuid4(), nursery_id=nursery.id, label=label, is_active=True)
        db.add(fam)
        await db.flush()
        children = [Child(id=uuid.uuid4(), family_id=fam.id, nursery_id=nursery.id, first_name=first, last_name=label,
                          birth_date=date(2024, 3, 1), status=ChildStatus.ACTIVE, enrollment_date=date(2025, 9, 1))
                    for first in kids]
        guardians = [Guardian(id=uuid.uuid4(), family_id=fam.id, nursery_id=nursery.id, first_name=first,
                              last_name=label, email=email, phone="0600000000", is_active=True)
                     for first, email, *_ in adults]
        db.add_all(children + guardians)
        await db.flush()
        for child in children:
            for guardian, (*_, relation, authority) in zip(guardians, adults, strict=True):
                db.add(ChildGuardian(child_id=child.id, guardian_id=guardian.id, family_id=fam.id,
                                     relationship=relation, has_parental_authority=authority,
                                     is_authorized_pickup=True, is_emergency_contact=False))
        await db.flush()
        return children, guardians

    (w["leo"], w["mia"]), (w["alice"], w["jeanne"], w["karim"]) = await family(
        w["nord"], "Garnier", ("Léo", "Mia"),
        (("Alice", "alice@famille.test", Relationship.PARENT, True),
         ("Jeanne", "jeanne@famille.test", Relationship.OTHER, False),
         ("Karim", None, Relationship.PARENT, True)))
    (w["emma"],), (w["sophie"],) = await family(w["nord"], "Lambert", ("Emma",),
                                                (("Sophie", "sophie@famille.test", Relationship.PARENT, True),))
    # Alice a aussi un enfant à la crèche Sud (autre famille, autre fiche, même adresse).
    (w["nina"],), (w["alice_sud"],) = await family(w["sud"], "Roux", ("Nina",),
                                                   (("Alice", "alice@famille.test", Relationship.PARENT, True),))
    return w


async def invite(clients, world, guardian, owner_email="direction@a.test", nursery="nord"):
    owner = clients()
    await login(owner, owner_email)
    return await owner.post(f"/api/v2/nurseries/{world[nursery].id}/guardians/{world[guardian].id}/invitation")


async def accept(http, token, password=PARENT_PASSWORD):
    return await http.post("/api/v2/invitations/accept", json={"token": token, "password": password})


async def parent(clients, email):
    client = clients()
    assert (await login(client, email, PARENT_PASSWORD)).status_code == 200
    return client


def names(response):
    return sorted(child["first_name"] for child in response.json())


# --- Invitation ----------------------------------------------------------------

async def test_invitation_puis_creation_du_compte(clients, world, clock, db):
    response = await invite(clients, world, "alice")
    assert response.status_code == 201, response.text
    token = response.json()["token"]
    assert response.json()["email"] == "alice@famille.test"

    anonymous = clients()
    info = await anonymous.post("/api/v2/invitations/lookup", json={"token": token})
    assert info.json() == {"first_name": "Alice", "nursery_name": "Crèche Nord", "email": "alice@famille.test",
                           "account_exists": False}
    assert (await accept(anonymous, token, "trop court")).status_code == 422
    created = await accept(anonymous, token)
    assert created.status_code == 201 and created.json() == {"email": "alice@famille.test", "account_created": True}
    assert (await accept(anonymous, token)).status_code == 404  # usage unique

    user = await db.scalar(select(AppUser).where(AppUser.email == "alice@famille.test"))
    assert user.role == UserRole.GUARDIAN and user.enterprise_id is None
    alice = await parent(clients, "alice@famille.test")
    assert names(await alice.get("/api/v2/family/children")) == ["Léo", "Mia"]
    events = [e.event for e in await db.scalars(select(AuthEvent).where(AuthEvent.event.like("invitation_%")))]
    assert sorted(events) == ["invitation_accepted", "invitation_created"]
    assert not any(token in str(vars(e)) for e in await db.scalars(select(AuthEvent)))


async def test_nouvelle_invitation_annule_la_precedente(clients, world, clock):
    first = (await invite(clients, world, "alice")).json()["token"]
    second = (await invite(clients, world, "alice")).json()["token"]
    anonymous = clients()
    assert (await anonymous.post("/api/v2/invitations/lookup", json={"token": first})).status_code == 404
    assert (await anonymous.post("/api/v2/invitations/lookup", json={"token": second})).status_code == 200


async def test_invitation_expiree_apres_7_jours(clients, world, clock):
    token = (await invite(clients, world, "alice")).json()["token"]
    clock["now"] = NOW + timedelta(days=7)
    assert (await accept(clients(), token)).status_code == 404


@pytest.mark.parametrize(("guardian", "owner", "nursery", "expected"), [
    ("karim", "direction@a.test", "nord", 422),  # pas d'adresse e-mail
    ("alice_sud", "direction@a.test", "nord", 404),  # fiche d'une autre crèche dans l'URL
    ("alice", "employe@a.test", "nord", 403),
    ("alice", "direction@b.test", "nord", 404),
])
async def test_invitation_refusee(clients, world, clock, guardian, owner, nursery, expected):
    assert (await invite(clients, world, guardian, owner, nursery)).status_code == expected


async def test_compte_existant_relie_avec_son_mot_de_passe(clients, world, clock):
    await accept(clients(), (await invite(clients, world, "alice")).json()["token"])
    token = (await invite(clients, world, "alice_sud", nursery="sud")).json()["token"]
    anonymous = clients()
    assert (await anonymous.post("/api/v2/invitations/lookup", json={"token": token})).json()["account_exists"]
    assert (await accept(anonymous, token, "un autre mot de passe long")).status_code == 403
    linked = await accept(anonymous, token)
    assert linked.status_code == 201 and linked.json()["account_created"] is False
    alice = await parent(clients, "alice@famille.test")
    children = (await alice.get("/api/v2/family/children")).json()
    assert {(c["first_name"], c["nursery_name"]) for c in children} == {
        ("Léo", "Crèche Nord"), ("Mia", "Crèche Nord"), ("Nina", "Crèche Sud")}


async def test_adresse_deja_prise_par_un_compte_du_personnel(clients, world, clock, db):
    world["sophie"].email = "employe@a.test"
    await db.flush()
    token = (await invite(clients, world, "sophie")).json()["token"]
    assert (await accept(clients(), token, PASSWORD)).status_code == 409


# --- Consultation -----------------------------------------------------------------

async def activate(clients, world, guardian):
    await accept(clients(), (await invite(clients, world, guardian)).json()["token"])
    return await parent(clients, world[guardian].email)


async def test_un_parent_ne_voit_que_ses_enfants(clients, world, clock):
    alice = await activate(clients, world, "alice")
    assert (await alice.get(f"/api/v2/family/children/{world['emma'].id}")).status_code == 404
    assert (await alice.get(f"/api/v2/family/children/{world['nina'].id}")).status_code == 404  # fiche Sud non reliée
    sophie = await activate(clients, world, "sophie")
    assert names(await sophie.get("/api/v2/family/children")) == ["Emma"]
    assert (await sophie.get(f"/api/v2/family/children/{world['leo'].id}")).status_code == 404


async def test_sans_autorite_parentale_pas_d_acces_au_dossier(clients, world, clock):
    jeanne = await activate(clients, world, "jeanne")
    assert (await jeanne.get("/api/v2/family/children")).json() == []
    assert (await jeanne.get(f"/api/v2/family/children/{world['leo'].id}")).status_code == 404


async def test_fiche_desactivee_coupe_l_acces(clients, world, clock, db):
    alice = await activate(clients, world, "alice")
    world["alice"].is_active = False
    await db.flush()
    assert (await alice.get("/api/v2/family/children")).json() == []


@pytest.mark.parametrize("email", ["direction@a.test", "employe@a.test"])
async def test_espace_famille_reserve_aux_familles(clients, world, clock, email):
    client = clients()
    await login(client, email)
    assert (await client.get("/api/v2/family/children")).status_code == 403


async def test_fiche_avec_presences_et_contacts_sans_coordonnees(clients, world, clock, db):
    leo, nord = world["leo"], world["nord"]
    db.add_all([
        Attendance(id=uuid.uuid4(), child_id=leo.id, nursery_id=nord.id, day=date(2026, 7, 14),
                   arrived_at=datetime(2026, 7, 14, 6, 30, tzinfo=UTC), departed_at=datetime(2026, 7, 14, 15, 0,
                                                                                             tzinfo=UTC),
                   picked_up_by=world["karim"].id),
        Attendance(id=uuid.uuid4(), child_id=leo.id, nursery_id=nord.id, day=date(2026, 7, 15),
                   arrived_at=datetime(2026, 7, 15, 7, 0, tzinfo=UTC)),
        Attendance(id=uuid.uuid4(), child_id=leo.id, nursery_id=nord.id, day=date(2026, 5, 1),
                   arrived_at=datetime(2026, 5, 1, 7, 0, tzinfo=UTC), departed_at=datetime(2026, 5, 1, 15, 0,
                                                                                           tzinfo=UTC)),
    ])
    await db.flush()
    alice = await activate(clients, world, "alice")
    listing = {c["first_name"]: c for c in (await alice.get("/api/v2/family/children")).json()}
    assert listing["Léo"]["today"] == "present" and listing["Mia"]["today"] == "absent"

    response = await alice.get(f"/api/v2/family/children/{leo.id}")
    detail = response.json()
    assert [(p["day"], p["picked_up_by"]) for p in detail["presences"]] == [
        ("2026-07-15", None), ("2026-07-14", "Karim G.")]  # 30 derniers jours : pas le 1er mai
    assert {c["display_name"] for c in detail["contacts"]} == {"Alice G.", "Jeanne G.", "Karim G."}
    assert "@" not in response.text and "0600000000" not in response.text
    longer = await alice.get(f"/api/v2/family/children/{leo.id}", params={"days": 62})
    assert len(longer.json()["presences"]) == 2
    assert (await alice.get(f"/api/v2/family/children/{leo.id}", params={"days": 400})).status_code == 422
