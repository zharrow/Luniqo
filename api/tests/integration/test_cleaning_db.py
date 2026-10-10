"""Pièces, catalogue des tâches et fiche du jour sur PostgreSQL (LUN-76)."""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from sqlalchemy.exc import IntegrityError

from app.auth.dependencies import get_now
from app.auth.models import UserRole
from app.cleaning.models import CleaningTask, Frequency, Room, RoomTask
from app.main import app
from tests.integration.conftest import login

pytestmark = pytest.mark.anyio

# Lundi 5 octobre 2026, 22 h 30 UTC : déjà mardi 6 à 0 h 30 à Paris.
LATE_MONDAY_UTC = datetime(2026, 10, 5, 22, 30, tzinfo=UTC)


@pytest.fixture
def clock():
    async def override_now():
        return LATE_MONDAY_UTC

    app.dependency_overrides[get_now] = override_now
    yield
    # Retiré même quand le test n'ouvre aucun client HTTP (qui vide les substitutions à sa fermeture).
    app.dependency_overrides.pop(get_now, None)


@pytest.fixture
async def world(data, clock):
    a, b = await data.enterprise("Groupe A"), await data.enterprise("Groupe B")
    w = {"a": a, "b": b, "nord": await data.nursery(a, "Crèche Nord"), "sud": await data.nursery(a, "Crèche Sud"),
         "temoin": await data.nursery(b, "Crèche Témoin"),
         "owner": await data.user("direction@a.test", UserRole.OWNER, a),
         "employee": await data.user("employe@a.test", UserRole.EMPLOYEE, a),
         "owner_b": await data.user("direction@b.test", UserRole.OWNER, b)}
    await data.grant(w["employee"], w["nord"])
    return w


async def client_of(clients, email="direction@a.test"):
    client = clients()
    assert (await login(client, email)).status_code == 200
    return client


async def new_task(client, name, instructions=None):
    response = await client.post("/api/v2/cleaning-tasks", json={"name": name, "instructions": instructions})
    assert response.status_code == 201, response.text
    return response.json()


async def new_room(client, nursery, name, order=0):
    response = await client.post(f"/api/v2/nurseries/{nursery.id}/rooms", json={"name": name, "display_order": order})
    assert response.status_code == 201, response.text
    return response.json()


def room_task_url(nursery, room, task):
    return f"/api/v2/nurseries/{nursery.id}/rooms/{room['id']}/tasks/{task['id']}"


def plan_of(response):
    assert response.status_code == 200, response.text
    body = response.json()
    return body["day"], {room["name"]: [task["name"] for task in room["tasks"]] for room in body["rooms"]}


# --- Parcours de la direction --------------------------------------------------

async def test_la_direction_compose_la_fiche_de_ses_pieces(clients, world):
    owner = await client_of(clients)
    change = await new_task(owner, "Désinfecter le plan de change", "Spray virucide, laisser agir 5 min")
    sols = await new_task(owner, "Laver les sols")
    vitres = await new_task(owner, "Nettoyer les vitres")
    salle = await new_room(owner, world["nord"], "Salle d'activité", order=1)
    bains = await new_room(owner, world["nord"], "Espace de change", order=0)

    nord = world["nord"]
    assert (await owner.put(room_task_url(nord, bains, change), json={"frequency": "daily"})).status_code == 200
    assert (await owner.put(room_task_url(nord, bains, sols), json={
        "frequency": "weekly", "weekdays": [5, 1], "display_order": 1})).json()["weekdays"] == [1, 5]
    assert (await owner.put(room_task_url(nord, salle, sols), json={"frequency": "weekly", "weekdays": [2]})
            ).status_code == 200
    assert (await owner.put(room_task_url(nord, salle, vitres), json={"frequency": "monthly", "weekdays": [1]})
            ).status_code == 200

    detail = (await owner.get(f"/api/v2/nurseries/{nord.id}/rooms/{bains['id']}")).json()
    assert [(t["task"]["name"], t["frequency"]) for t in detail["tasks"]] == [
        ("Désinfecter le plan de change", "daily"), ("Laver les sols", "weekly")]
    assert detail["tasks"][0]["task"]["instructions"] == "Spray virucide, laisser agir 5 min"

    base = f"/api/v2/nurseries/{nord.id}/cleaning/plan"
    # Lundi 5 octobre : premier lundi du mois. Pièces dans l'ordre de passage, la salle n'a que les vitres.
    assert plan_of(await owner.get(base, params={"day": "2026-10-05"})) == ("2026-10-05", {
        "Espace de change": ["Désinfecter le plan de change", "Laver les sols"],
        "Salle d'activité": ["Nettoyer les vitres"]})
    # Lundi 12 : les vitres (mensuel) ne reviennent pas.
    assert plan_of(await owner.get(base, params={"day": "2026-10-12"}))[1] == {
        "Espace de change": ["Désinfecter le plan de change", "Laver les sols"]}
    # Sans date : aujourd'hui en heure de Paris (mardi 6), pas la veille en UTC.
    assert plan_of(await owner.get(base)) == ("2026-10-06", {
        "Espace de change": ["Désinfecter le plan de change"], "Salle d'activité": ["Laver les sols"]})


async def test_changer_retirer_desactiver(clients, world):
    owner = await client_of(clients)
    nord = world["nord"]
    sols = await new_task(owner, "Laver les sols")
    salle = await new_room(owner, nord, "Salle d'activité")
    url, plan = room_task_url(nord, salle, sols), f"/api/v2/nurseries/{nord.id}/cleaning/plan?day=2026-10-06"

    first = (await owner.put(url, json={"frequency": "daily"})).json()
    # Remplacer la fréquence ne crée pas de doublon : même affectation.
    second = (await owner.put(url, json={"frequency": "weekly", "weekdays": [3]})).json()
    assert first["id"] == second["id"]
    detail = (await owner.get(f"/api/v2/nurseries/{nord.id}/rooms/{salle['id']}")).json()
    assert [t["frequency"] for t in detail["tasks"]] == ["weekly"]
    assert plan_of(await owner.get(plan))[1] == {}  # mardi : rien

    await owner.put(url, json={"frequency": "daily"})
    assert plan_of(await owner.get(plan))[1] == {"Salle d'activité": ["Laver les sols"]}

    # Retirée de la pièce : absente de la fiche, conservée (désactivée) dans le détail.
    await owner.put(url, json={"frequency": "daily", "is_active": False})
    assert plan_of(await owner.get(plan))[1] == {}
    assert (await owner.get(f"/api/v2/nurseries/{nord.id}/rooms/{salle['id']}")).json()["tasks"][0][
        "is_active"] is False
    await owner.put(url, json={"frequency": "daily"})

    # Pièce fermée : absente de la fiche et de la liste par défaut.
    assert (await owner.patch(f"/api/v2/nurseries/{nord.id}/rooms/{salle['id']}", json={"is_active": False})
            ).status_code == 200
    assert plan_of(await owner.get(plan))[1] == {}
    assert (await owner.get(f"/api/v2/nurseries/{nord.id}/rooms")).json() == []
    assert len((await owner.get(f"/api/v2/nurseries/{nord.id}/rooms?include_inactive=true")).json()) == 1
    await owner.patch(f"/api/v2/nurseries/{nord.id}/rooms/{salle['id']}", json={"is_active": True})

    # Tâche désactivée dans le catalogue : retirée des fiches de toutes les crèches, et plus affectable.
    sud_room = await new_room(owner, world["sud"], "Dortoir")
    await owner.put(room_task_url(world["sud"], sud_room, sols), json={"frequency": "daily"})
    assert (await owner.patch(f"/api/v2/cleaning-tasks/{sols['id']}", json={"is_active": False})).status_code == 200
    assert plan_of(await owner.get(plan))[1] == {}
    assert plan_of(await owner.get(f"/api/v2/nurseries/{world['sud'].id}/cleaning/plan?day=2026-10-06"))[1] == {}
    assert (await owner.get("/api/v2/cleaning-tasks")).json() == []
    assert (await owner.put(url, json={"frequency": "daily"})).status_code == 422
    # La retirer d'une pièce reste possible.
    assert (await owner.put(url, json={"frequency": "daily", "is_active": False})).status_code == 200


@pytest.mark.parametrize("body", [
    {"frequency": "daily", "weekdays": [1]},
    {"frequency": "weekly"},
    {"frequency": "weekly", "weekdays": [0, 3]},
    {"frequency": "monthly", "weekdays": [1, 2]},
    {"frequency": "yearly"},
    {"frequency": "daily", "display_order": -1},
])
async def test_frequence_incoherente_refusee(clients, world, body):
    owner = await client_of(clients)
    task, room = await new_task(owner, "Laver les sols"), await new_room(owner, world["nord"], "Salle")
    assert (await owner.put(room_task_url(world["nord"], room, task), json=body)).status_code == 422


async def test_noms_uniques_par_creche_et_par_entreprise(clients, world):
    # Un 409 annule la transaction de la requête, qui est aussi celle du test : les objets de `world`
    # expirent et ne se relisent plus. Leurs identifiants sont donc relevés avant.
    nord, sud = SimpleNamespace(id=world["nord"].id), SimpleNamespace(id=world["sud"].id)
    owner = await client_of(clients)
    await new_task(owner, "Laver les sols")
    assert (await owner.post("/api/v2/cleaning-tasks", json={"name": "Laver les sols"})).status_code == 409
    await new_room(owner, nord, "Dortoir")
    assert (await owner.post(f"/api/v2/nurseries/{nord.id}/rooms", json={"name": "Dortoir"})).status_code == 409
    # Même nom ailleurs : permis.
    await new_room(owner, sud, "Dortoir")
    other = await client_of(clients, "direction@b.test")
    await new_task(other, "Laver les sols")
    # Renommer vers un nom pris : 409, et l'objet garde son nom.
    vitres = await new_task(owner, "Nettoyer les vitres")
    assert (await owner.patch(f"/api/v2/cleaning-tasks/{vitres['id']}", json={"name": "Laver les sols"})
            ).status_code == 409
    assert sorted(t["name"] for t in (await owner.get("/api/v2/cleaning-tasks")).json()) == [
        "Laver les sols", "Nettoyer les vitres"]
    assert (await owner.patch(f"/api/v2/cleaning-tasks/{vitres['id']}", json={"name": None})).status_code == 422


# --- Droits ---------------------------------------------------------------------

async def test_l_employe_lit_la_fiche_mais_ne_la_modifie_pas(clients, world):
    owner = await client_of(clients)
    sols, room = await new_task(owner, "Laver les sols"), await new_room(owner, world["nord"], "Salle")
    await owner.put(room_task_url(world["nord"], room, sols), json={"frequency": "daily"})

    employee = await client_of(clients, "employe@a.test")
    base = f"/api/v2/nurseries/{world['nord'].id}"
    assert [r["name"] for r in (await employee.get(f"{base}/rooms")).json()] == ["Salle"]
    assert (await employee.get(f"{base}/rooms/{room['id']}")).status_code == 200
    assert plan_of(await employee.get(f"{base}/cleaning/plan"))[1] == {"Salle": ["Laver les sols"]}
    assert (await employee.post(f"{base}/rooms", json={"name": "x"})).status_code == 403
    assert (await employee.patch(f"{base}/rooms/{room['id']}", json={"name": "x"})).status_code == 403
    assert (await employee.put(room_task_url(world["nord"], room, sols), json={"frequency": "daily"})
            ).status_code == 403
    # Le catalogue est celui de l'entreprise : réservé à la direction.
    assert (await employee.get("/api/v2/cleaning-tasks")).status_code == 403
    assert (await employee.post("/api/v2/cleaning-tasks", json={"name": "x"})).status_code == 403


# --- Isolation ------------------------------------------------------------------

async def test_isolation_entre_creches_et_entreprises(clients, world):
    owner = await client_of(clients)
    sols = await new_task(owner, "Laver les sols")
    room_sud = await new_room(owner, world["sud"], "Dortoir")
    await owner.put(room_task_url(world["sud"], room_sud, sols), json={"frequency": "daily"})
    nord, sud = f"/api/v2/nurseries/{world['nord'].id}", f"/api/v2/nurseries/{world['sud'].id}"

    # Les listes ne débordent pas d'une crèche à l'autre : Nord n'a ni pièce ni tâche prévue.
    assert (await owner.get(f"{nord}/rooms")).json() == []
    assert plan_of(await owner.get(f"{nord}/cleaning/plan"))[1] == {}
    assert plan_of(await owner.get(f"{sud}/cleaning/plan"))[1] == {"Dortoir": ["Laver les sols"]}

    # Même direction, pièce de Sud demandée par l'URL de Nord : introuvable.
    assert (await owner.get(f"{nord}/rooms/{room_sud['id']}")).status_code == 404
    assert (await owner.patch(f"{nord}/rooms/{room_sud['id']}", json={"name": "x"})).status_code == 404
    assert (await owner.put(f"{nord}/rooms/{room_sud['id']}/tasks/{sols['id']}", json={"frequency": "daily"})
            ).status_code == 404

    # Employé sans accès à Sud : la crèche n'existe pas pour lui.
    employee = await client_of(clients, "employe@a.test")
    assert (await employee.get(f"{sud}/rooms")).status_code == 404
    assert (await employee.get(f"{sud}/cleaning/plan")).status_code == 404

    # Autre entreprise : ni les pièces, ni le catalogue, ni l'affectation d'une tâche étrangère.
    other = await client_of(clients, "direction@b.test")
    assert (await other.get(f"{sud}/rooms/{room_sud['id']}")).status_code == 404
    assert (await other.get("/api/v2/cleaning-tasks")).json() == []
    assert (await other.patch(f"/api/v2/cleaning-tasks/{sols['id']}", json={"name": "x"})).status_code == 404
    room_b = await new_room(other, world["temoin"], "Salle")
    assert (await other.put(room_task_url(world["temoin"], room_b, sols), json={"frequency": "daily"})
            ).status_code == 404
    assert (await owner.put(room_task_url(world["sud"], room_sud, {"id": str(uuid.uuid4())}),
                            json={"frequency": "daily"})).status_code == 404


async def test_la_base_refuse_une_affectation_incoherente(db, data, world):
    """Second rempart : même si le code se trompait, la base refuse de mélanger crèches et entreprises."""
    a, b = world["a"], world["b"]
    room_nord = Room(id=uuid.uuid4(), nursery_id=world["nord"].id, name="Salle", display_order=0, is_active=True)
    task_a = CleaningTask(id=uuid.uuid4(), enterprise_id=a.id, name="Sols", is_active=True)
    task_b = CleaningTask(id=uuid.uuid4(), enterprise_id=b.id, name="Sols", is_active=True)
    db.add_all([room_nord, task_a, task_b])
    await db.flush()

    def assignment(**overrides):
        values = {"id": uuid.uuid4(), "room_id": room_nord.id, "task_id": task_a.id, "nursery_id": world["nord"].id,
                  "enterprise_id": a.id, "frequency": Frequency.DAILY, "weekdays": None, "display_order": 0,
                  "is_active": True}
        return RoomTask(**values | overrides)

    for overrides, constraint in [
        ({"task_id": task_b.id}, "fk_room_task_task_enterprise"),  # tâche d'une autre entreprise
        ({"task_id": task_b.id, "enterprise_id": b.id}, "fk_room_task_nursery_enterprise"),  # en se déclarant de B
        ({"nursery_id": world["sud"].id}, "fk_room_task_room_nursery"),  # pièce de Nord déclarée à Sud
        ({"frequency": Frequency.DAILY, "weekdays": [1]}, "room_task_daily_has_no_weekdays"),
        ({"frequency": Frequency.WEEKLY, "weekdays": [8]}, "room_task_weekdays_valid"),
        ({"frequency": Frequency.WEEKLY, "weekdays": []}, "room_task_weekdays_valid"),
        ({"frequency": Frequency.MONTHLY, "weekdays": [1, 2]}, "room_task_monthly_one_weekday"),
    ]:
        with pytest.raises(IntegrityError, match=constraint):
            async with db.begin_nested():
                db.add(assignment(**overrides))
                await db.flush()

    db.add(assignment())
    await db.flush()
    with pytest.raises(IntegrityError, match="uq_room_task_room_task"):
        async with db.begin_nested():
            db.add(assignment(frequency=Frequency.WEEKLY, weekdays=[1]))
            await db.flush()
