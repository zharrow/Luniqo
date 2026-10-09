"""Pointage de bout en bout sur PostgreSQL (LUN-010) : tablette enrôlée, session par PIN, suivi web."""

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError

from app.attendance.models import Attendance
from app.auth.dependencies import get_now
from app.auth.models import UserRole
from app.children.models import Child, ChildGuardian, ChildStatus, Family, Guardian, Relationship
from app.main import app
from tests.integration.conftest import login
from tests.integration.test_tablets_db import PIN_HASH, enrolled_tablet, pin_login

pytestmark = pytest.mark.anyio

# 9 h 00 à Paris, en été.
MORNING = datetime(2026, 7, 15, 7, 0, tzinfo=UTC)


@pytest.fixture
def clock():
    state = {"now": MORNING}

    async def override_now():
        return state["now"]

    app.dependency_overrides[get_now] = override_now
    return state


@pytest.fixture
async def world(data, db):
    a, b = await data.enterprise("Groupe A"), await data.enterprise("Groupe B")
    w = {"a": a, "nord": await data.nursery(a, "Crèche Nord"), "sud": await data.nursery(a, "Crèche Sud"),
         "owner": await data.user("direction@a.test", UserRole.OWNER, a),
         "owner_b": await data.user("direction@b.test", UserRole.OWNER, b)}
    for key, nursery in (("lea", "nord"), ("sans_acces", "sud")):
        user = await data.user(f"{key}@a.test", UserRole.EMPLOYEE, a)
        user.first_name, user.last_name, user.pin_hash = key.capitalize(), "Test", PIN_HASH
        await data.grant(user, w[nursery])
        w[key] = user

    async def family(nursery, label, kids, adults):
        fam = Family(id=uuid.uuid4(), nursery_id=nursery.id, label=label, is_active=True)
        db.add(fam)
        await db.flush()
        children = [Child(id=uuid.uuid4(), family_id=fam.id, nursery_id=nursery.id, first_name=first,
                          last_name=label, birth_date=date(2024, 3, 1), status=status, enrollment_date=enrolled)
                    for first, status, enrolled in kids]
        guardians = [Guardian(id=uuid.uuid4(), family_id=fam.id, nursery_id=nursery.id, first_name=first,
                              last_name=label, is_active=True) for first, *_ in adults]
        db.add_all(children + guardians)
        await db.flush()
        for child in children:
            for guardian, (_, relation, pickup) in zip(guardians, adults, strict=True):
                db.add(ChildGuardian(child_id=child.id, guardian_id=guardian.id, family_id=fam.id,
                                     relationship=relation, has_parental_authority=pickup,
                                     is_authorized_pickup=pickup, is_emergency_contact=False))
        await db.flush()
        return children, guardians

    (w["leo"], w["suspendu"], w["futur"]), (w["alice"], w["jeanne"]) = await family(
        w["nord"], "Garnier",
        (("Léo", ChildStatus.ACTIVE, date(2025, 9, 1)), ("Suspendu", ChildStatus.SUSPENDED, date(2025, 9, 1)),
         ("Futur", ChildStatus.ADAPTATION, date(2026, 9, 1))),
        (("Alice", Relationship.PARENT, True), ("Jeanne", Relationship.OTHER, False)))
    (w["emma"],), (w["sophie"],) = await family(w["nord"], "Lambert", (("Emma", ChildStatus.ACTIVE, date(2025, 9, 1)),),
                                                (("Sophie", Relationship.PARENT, True),))
    (w["nina"],), _ = await family(w["sud"], "Roux", (("Nina", ChildStatus.ACTIVE, date(2025, 9, 1)),),
                                   (("Thomas", Relationship.PARENT, True),))
    return w


async def ready_tablet(clients, world):
    tablet, _ = await enrolled_tablet(clients, world)
    assert (await pin_login(tablet, world["lea"])).status_code == 201
    return tablet


def by_name(children):
    return {child["first_name"]: child for child in children}


# --- Parcours ----------------------------------------------------------------------

async def test_arrivee_puis_depart_avec_une_personne_autorisee(clients, world, clock):
    tablet = await ready_tablet(clients, world)
    listing = by_name((await tablet.get("/api/v2/tablet/children")).json())
    # Ni l'enfant suspendu, ni celui pas encore inscrit, ni ceux d'une autre crèche.
    assert set(listing) == {"Léo", "Emma"}
    assert listing["Léo"]["presence"] == "absent"
    pickups = {g["display_name"]: g["is_authorized_pickup"] for g in listing["Léo"]["guardians"]}
    assert pickups == {"Alice G.": True, "Jeanne G.": False}

    leo = world["leo"].id
    response = await tablet.post(f"/api/v2/tablet/children/{leo}/arrival",
                                 json={"dropped_off_by": str(world["alice"].id)})
    assert response.status_code == 201, response.text
    arrival = response.json()
    assert arrival["arrival_by"] == "Lea T." and arrival["dropped_off_by"] == "Alice G."
    assert arrival["arrived_at"].startswith("2026-07-15T07:00") and arrival["day"] == "2026-07-15"
    assert (await tablet.post(f"/api/v2/tablet/children/{leo}/arrival", json={})).status_code == 409

    clock["now"] = MORNING + timedelta(minutes=1)
    refused = await tablet.post(f"/api/v2/tablet/children/{leo}/departure",
                                json={"picked_up_by": str(world["jeanne"].id)})
    assert refused.status_code == 403
    assert by_name((await tablet.get("/api/v2/tablet/children")).json())["Léo"]["presence"] == "present"

    response = await tablet.post(f"/api/v2/tablet/children/{leo}/departure",
                                 json={"picked_up_by": str(world["alice"].id)})
    assert response.status_code == 200, response.text
    assert response.json()["picked_up_by"] == "Alice G." and response.json()["departure_by"] == "Lea T."
    assert by_name((await tablet.get("/api/v2/tablet/children")).json())["Léo"]["presence"] == "left"
    assert (await tablet.post(f"/api/v2/tablet/children/{leo}/departure",
                              json={"picked_up_by": str(world["alice"].id)})).status_code == 409


async def test_la_direction_suit_les_presences(clients, world, clock):
    tablet = await ready_tablet(clients, world)
    await tablet.post(f"/api/v2/tablet/children/{world['leo'].id}/arrival", json={})
    await tablet.post(f"/api/v2/tablet/children/{world['emma'].id}/arrival", json={})
    await tablet.post(f"/api/v2/tablet/children/{world['emma'].id}/departure",
                      json={"picked_up_by": str(world["sophie"].id)})
    owner = clients()
    await login(owner, "direction@a.test")
    base = f"/api/v2/nurseries/{world['nord'].id}/attendance"
    day = (await owner.get(base)).json()
    assert {(p["child_name"], p["departed_at"] is None) for p in day} == {("Léo Garnier", True),
                                                                         ("Emma Lambert", False)}
    assert [p["child_name"] for p in (await owner.get(f"{base}/present")).json()] == ["Léo Garnier"]
    assert (await owner.get(base, params={"day": "2026-07-14"})).json() == []

    employee_sud = clients()
    await login(employee_sud, "sans_acces@a.test")
    assert (await employee_sud.get(base)).status_code == 404
    other = clients()
    await login(other, "direction@b.test")
    assert (await other.get(f"{base}/present")).status_code == 404


async def test_retour_dans_la_journee(clients, world, clock):
    tablet = await ready_tablet(clients, world)
    url = f"/api/v2/tablet/children/{world['leo'].id}"
    assert (await tablet.post(f"{url}/arrival", json={})).status_code == 201
    assert (await tablet.post(f"{url}/departure", json={"picked_up_by": str(world["alice"].id)})).status_code == 200
    assert (await tablet.post(f"{url}/arrival", json={})).status_code == 201
    owner = clients()
    await login(owner, "direction@a.test")
    assert len((await owner.get(f"/api/v2/nurseries/{world['nord'].id}/attendance")).json()) == 2


# --- Refus --------------------------------------------------------------------------

@pytest.mark.parametrize(("child", "expected"), [("suspendu", 409), ("futur", 409), ("nina", 404)])
async def test_arrivee_refusee(clients, world, clock, child, expected):
    tablet = await ready_tablet(clients, world)
    response = await tablet.post(f"/api/v2/tablet/children/{world[child].id}/arrival", json={})
    assert response.status_code == expected


async def test_deposant_hors_famille_refuse(clients, world, clock):
    tablet = await ready_tablet(clients, world)
    response = await tablet.post(f"/api/v2/tablet/children/{world['leo'].id}/arrival",
                                 json={"dropped_off_by": str(world["sophie"].id)})
    assert response.status_code == 422


async def test_responsable_d_une_autre_famille_ne_peut_pas_chercher(clients, world, clock):
    tablet = await ready_tablet(clients, world)
    await tablet.post(f"/api/v2/tablet/children/{world['leo'].id}/arrival", json={})
    response = await tablet.post(f"/api/v2/tablet/children/{world['leo'].id}/departure",
                                 json={"picked_up_by": str(world["sophie"].id)})
    assert response.status_code == 403


async def test_responsable_desactive_ne_peut_plus_chercher(clients, world, clock, db):
    tablet = await ready_tablet(clients, world)
    await tablet.post(f"/api/v2/tablet/children/{world['leo'].id}/arrival", json={})
    world["alice"].is_active = False
    await db.flush()
    response = await tablet.post(f"/api/v2/tablet/children/{world['leo'].id}/departure",
                                 json={"picked_up_by": str(world["alice"].id)})
    assert response.status_code == 403


async def test_pointage_impossible_sans_session_par_pin(clients, world, clock):
    tablet, _ = await enrolled_tablet(clients, world)
    url = f"/api/v2/tablet/children/{world['leo'].id}/arrival"
    assert (await tablet.post(url, json={})).status_code == 401
    # Une session web (direction) ne suffit pas non plus : il faut la tablette et le PIN.
    owner = clients()
    await login(owner, "direction@a.test")
    assert (await owner.post(url, json={})).status_code == 401


async def test_l_heure_vient_du_serveur(clients, world, clock):
    tablet = await ready_tablet(clients, world)
    response = await tablet.post(f"/api/v2/tablet/children/{world['leo'].id}/arrival",
                                 json={"arrived_at": "2026-07-15T05:00:00Z"})
    assert response.json()["arrived_at"].startswith("2026-07-15T07:00")


# --- Heure de Paris et base ----------------------------------------------------------

async def test_arrivee_a_0h30_comptee_le_bon_jour(clients, world, clock):
    clock["now"] = datetime(2026, 7, 14, 22, 30, tzinfo=UTC)  # 0 h 30 le 15 à Paris
    tablet = await ready_tablet(clients, world)
    response = await tablet.post(f"/api/v2/tablet/children/{world['leo'].id}/arrival", json={})
    assert response.json()["day"] == "2026-07-15"
    owner = clients()
    await login(owner, "direction@a.test")
    url = f"/api/v2/nurseries/{world['nord'].id}/attendance"
    assert len((await owner.get(url)).json()) == 1  # « aujourd'hui » = le 15 à Paris
    assert (await owner.get(url, params={"day": "2026-07-14"})).json() == []


async def test_une_seule_presence_ouverte_par_enfant_en_base(world, db):
    def presence():
        return Attendance(id=uuid.uuid4(), child_id=world["leo"].id, nursery_id=world["nord"].id,
                          day=date(2026, 7, 15), arrived_at=MORNING)
    db.add(presence())
    await db.flush()
    with pytest.raises(IntegrityError, match="uq_attendance_one_open_per_child"):
        async with db.begin_nested():
            db.add(presence())
            await db.flush()


async def test_presence_dans_une_autre_creche_refusee_par_la_base(world, db):
    with pytest.raises(IntegrityError, match="fk_attendance_child_nursery"):
        async with db.begin_nested():
            db.add(Attendance(id=uuid.uuid4(), child_id=world["leo"].id, nursery_id=world["sud"].id,
                              day=date(2026, 7, 15), arrived_at=MORNING))
            await db.flush()
