"""Fiche de ménage remplie depuis la tablette, sur PostgreSQL (LUN-77)."""

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.auth.dependencies import get_now
from app.auth.models import UserRole
from app.cleaning.models import CleaningCheck, CleaningTask, Frequency, Room, RoomTask
from app.main import app
from tests.integration.conftest import login
from tests.integration.test_tablets_db import PIN_HASH, Clock, enrolled_tablet, pin_login

pytestmark = pytest.mark.anyio

# Mardi 6 octobre 2026, 9 h à Paris.
TUESDAY_MORNING = datetime(2026, 10, 6, 7, 0, tzinfo=UTC)


@pytest.fixture
def clock():
    clock = Clock()
    clock.now = TUESDAY_MORNING

    async def override_now():
        return clock.now

    app.dependency_overrides[get_now] = override_now
    yield clock
    app.dependency_overrides.pop(get_now, None)


@pytest.fixture
async def world(data, db, clock):
    a = await data.enterprise("Groupe A")
    w = {"a": a, "nord": await data.nursery(a, "Crèche Nord"), "sud": await data.nursery(a, "Crèche Sud"),
         "owner": await data.user("direction@a.test", UserRole.OWNER, a)}
    for key, first, nursery in (("lea", "Léa", "nord"), ("hugo", "Hugo", "nord")):
        user = await data.user(f"{key}@a.test", UserRole.EMPLOYEE, a)
        user.first_name, user.last_name, user.pin_hash = first, "Bernard", PIN_HASH
        await data.grant(user, w[nursery])
        w[key] = user

    tasks = {name: CleaningTask(id=uuid.uuid4(), enterprise_id=a.id, name=name, is_active=True)
             for name in ("Désinfecter le plan de change", "Laver les sols", "Changer les draps")}
    rooms = {key: Room(id=uuid.uuid4(), nursery_id=w[nursery].id, name=name, display_order=order, is_active=True)
             for key, nursery, name, order in (("change", "nord", "Espace de change", 0),
                                                ("dortoir", "nord", "Dortoir", 1), ("sud", "sud", "Salle", 0))}
    db.add_all([*tasks.values(), *rooms.values()])
    await db.flush()

    def assign(key, room, task, frequency=Frequency.DAILY, weekdays=None):
        w[key] = RoomTask(id=uuid.uuid4(), room_id=rooms[room].id, task_id=tasks[task].id,
                          nursery_id=rooms[room].nursery_id, enterprise_id=a.id, frequency=frequency,
                          weekdays=weekdays, display_order=0, is_active=True)
        db.add(w[key])

    assign("change", "change", "Désinfecter le plan de change")
    assign("sols_mardi", "dortoir", "Laver les sols", Frequency.WEEKLY, [2])
    assign("draps_vendredi", "dortoir", "Changer les draps", Frequency.WEEKLY, [5])
    assign("sud", "sud", "Laver les sols")
    await db.flush()
    w["tasks"], w["rooms"] = tasks, rooms
    return w


async def ready_tablet(clients, world, employee="lea"):
    tablet, _ = await enrolled_tablet(clients, world)
    assert (await pin_login(tablet, world[employee])).status_code == 201
    return tablet


def check_url(room_task):
    return f"/api/v2/tablet/cleaning/{room_task.id}/check"


def sheet_of(response):
    assert response.status_code == 200, response.text
    body = response.json()
    return body["day"], {room["name"]: {task["name"]: task["done_by"] for task in room["tasks"]}
                         for room in body["rooms"]}


# --- Parcours ----------------------------------------------------------------------

async def test_l_employe_coche_puis_decoche_une_tache(clients, world, db, clock):
    tablet = await ready_tablet(clients, world)
    # Mardi : les draps (vendredi) ne figurent pas sur la fiche.
    assert sheet_of(await tablet.get("/api/v2/tablet/cleaning")) == ("2026-10-06", {
        "Espace de change": {"Désinfecter le plan de change": None}, "Dortoir": {"Laver les sols": None}})

    clock.advance(seconds=30)
    response = await tablet.post(check_url(world["change"]), json={})
    assert response.status_code == 201, response.text
    body = response.json()
    # Heure du serveur, jour de Paris, noms recopiés, auteur affiché en prénom et initiale.
    assert body | {"id": None} == {"id": None, "room_task_id": str(world["change"].id), "day": "2026-10-06",
                                    "room_name": "Espace de change", "task_name": "Désinfecter le plan de change",
                                    "done_at": "2026-10-06T07:00:30Z", "done_by": "Léa B."}
    assert sheet_of(await tablet.get("/api/v2/tablet/cleaning"))[1]["Espace de change"] == {
        "Désinfecter le plan de change": "Léa B."}
    assert (await tablet.post(check_url(world["change"]))).status_code == 409  # déjà cochée

    # Décocher : la coche reste, annulée, avec son auteur.
    assert (await tablet.delete(check_url(world["change"]))).status_code == 204
    assert sheet_of(await tablet.get("/api/v2/tablet/cleaning"))[1]["Espace de change"] == {
        "Désinfecter le plan de change": None}
    assert (await tablet.delete(check_url(world["change"]))).status_code == 409  # plus rien à décocher
    assert (await tablet.post(check_url(world["change"]))).status_code == 201
    rows = (await db.scalars(select(CleaningCheck).where(CleaningCheck.room_task_id == world["change"].id)
                             .order_by(CleaningCheck.done_at))).all()
    assert [(row.cancelled_at is not None, row.cancelled_by_name) for row in rows] == [
        (True, "Léa Bernard"), (False, None)]


async def test_un_collegue_voit_et_peut_decocher(clients, world):
    tablet = await ready_tablet(clients, world)
    assert (await tablet.post(check_url(world["sols_mardi"]))).status_code == 201
    assert (await tablet.delete("/api/v2/tablet/session")).status_code == 204
    assert (await pin_login(tablet, world["hugo"])).status_code == 201
    assert sheet_of(await tablet.get("/api/v2/tablet/cleaning"))[1]["Dortoir"] == {"Laver les sols": "Léa B."}
    assert (await tablet.delete(check_url(world["sols_mardi"]))).status_code == 204


async def test_seules_les_taches_prevues_aujourd_hui_se_cochent(clients, world, db):
    tablet = await ready_tablet(clients, world)
    assert (await tablet.post(check_url(world["draps_vendredi"]))).status_code == 409  # pas un vendredi
    world["change"].is_active = False  # retirée de la pièce
    world["rooms"]["dortoir"].is_active = False  # pièce fermée
    await db.flush()
    assert (await tablet.post(check_url(world["change"]))).status_code == 409
    assert (await tablet.post(check_url(world["sols_mardi"]))).status_code == 409
    assert sheet_of(await tablet.get("/api/v2/tablet/cleaning"))[1] == {}


async def test_tache_du_catalogue_desactivee_ne_se_coche_plus(clients, world, db):
    tablet = await ready_tablet(clients, world)
    world["tasks"]["Désinfecter le plan de change"].is_active = False
    await db.flush()
    assert (await tablet.post(check_url(world["change"]))).status_code == 409


async def test_jour_en_heure_de_paris_et_jours_passes_clos(clients, world, clock):
    # Lundi 22 h 30 UTC : déjà mardi 0 h 30 à Paris, la tâche du mardi se coche et compte pour mardi.
    clock.now = datetime(2026, 10, 5, 22, 30, tzinfo=UTC)
    tablet = await ready_tablet(clients, world)
    response = await tablet.post(check_url(world["sols_mardi"]))
    assert response.status_code == 201 and response.json()["day"] == "2026-10-06"

    # Le lendemain, la fiche repart vierge et la coche de la veille ne se décoche plus depuis la tablette.
    clock.now = datetime(2026, 10, 7, 7, 0, tzinfo=UTC)
    assert (await pin_login(tablet, world["lea"])).status_code == 201
    assert sheet_of(await tablet.get("/api/v2/tablet/cleaning")) == ("2026-10-07", {
        "Espace de change": {"Désinfecter le plan de change": None}})
    assert (await tablet.delete(check_url(world["sols_mardi"]))).status_code == 409


async def test_la_fiche_garde_les_noms_du_jour_ou_elle_est_remplie(clients, world, db):
    tablet = await ready_tablet(clients, world)
    assert (await tablet.post(check_url(world["change"]))).status_code == 201
    world["tasks"]["Désinfecter le plan de change"].name = "Plan de change : désinfection"
    world["rooms"]["change"].name = "Change"
    await db.delete(world["lea"])  # compte supprimé : l'auteur reste lisible
    await db.flush()
    row = await db.scalar(select(CleaningCheck).where(CleaningCheck.room_task_id == world["change"].id))
    await db.refresh(row)
    assert (row.room_name, row.task_name, row.done_by, row.done_by_name) == (
        "Espace de change", "Désinfecter le plan de change", None, "Léa Bernard")


# --- Accès et isolation ---------------------------------------------------------------

async def test_isolation_et_session_par_pin_obligatoire(clients, world):
    tablet, _ = await enrolled_tablet(clients, world)
    # Tablette enrôlée, mais pas de PIN saisi : refus.
    assert (await tablet.get("/api/v2/tablet/cleaning")).status_code == 401
    assert (await tablet.post(check_url(world["change"]))).status_code == 401
    # Session web de la direction, sans tablette : refus.
    owner = clients()
    assert (await login(owner, "direction@a.test")).status_code == 200
    assert (await owner.get("/api/v2/tablet/cleaning")).status_code == 401
    assert (await owner.post(check_url(world["change"]))).status_code == 401

    assert (await pin_login(tablet, world["lea"])).status_code == 201
    # Tâche d'une autre crèche (même entreprise) ou inexistante : introuvable depuis la tablette de Nord.
    assert (await tablet.post(check_url(world["sud"]))).status_code == 404
    assert (await tablet.post(f"/api/v2/tablet/cleaning/{uuid.uuid4()}/check")).status_code == 404
    assert "Salle" not in sheet_of(await tablet.get("/api/v2/tablet/cleaning"))[1]


async def test_la_base_garde_une_seule_coche_par_tache_et_par_jour(db, world):
    def done(room_task, **overrides):
        values = {"id": uuid.uuid4(), "room_task_id": room_task.id, "nursery_id": room_task.nursery_id,
                  "day": TUESDAY_MORNING.date(), "room_name": "x", "task_name": "x", "done_at": TUESDAY_MORNING,
                  "done_by": None, "done_by_name": "Léa Bernard"}
        return CleaningCheck(**values | overrides)

    first = done(world["change"])
    db.add(first)
    await db.flush()
    for row, constraint in [
        (done(world["change"]), "uq_cleaning_check_one_per_day"),
        (done(world["change"], day=datetime(2026, 10, 7).date(), nursery_id=world["sud"].id),
         "fk_cleaning_check_room_task_nursery"),
        (done(world["change"], day=datetime(2026, 10, 7).date(), cancelled_at=TUESDAY_MORNING),
         "cleaning_check_cancel_has_author"),
        (done(world["change"], day=datetime(2026, 10, 7).date(), cancelled_at=datetime(2026, 10, 6, 6, tzinfo=UTC),
              cancelled_by_name="Léa Bernard"), "cleaning_check_cancel_after_done"),
    ]:
        with pytest.raises(IntegrityError, match=constraint):
            async with db.begin_nested():
                db.add(row)
                await db.flush()

    # Une fois la première annulée, une nouvelle coche le même jour est permise.
    first.cancelled_at, first.cancelled_by_name = TUESDAY_MORNING, "Léa Bernard"
    db.add(done(world["change"]))
    await db.flush()
