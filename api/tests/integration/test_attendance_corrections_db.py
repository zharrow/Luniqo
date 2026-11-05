"""Corrections des présences par la direction, sur PostgreSQL (LUN-120)."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import event, func, select

from app.attendance.models import Attendance, AttendanceCorrection, CorrectionKind
from tests.integration import test_attendance_db as attendance
from tests.integration.conftest import login
from tests.integration.test_attendance_db import MORNING, by_name, ready_tablet
from tests.integration.test_tablets_db import pin_login

pytestmark = pytest.mark.anyio

# Mêmes crèches, familles et horloge que les tests du pointage.
world = attendance.world
clock = attendance.clock

REASON = "Départ oublié sur la tablette"


def paris(hour: int, minute: int = 0, day: int = 15) -> str:
    """Heure de Paris en juillet 2026 (UTC+2), au format envoyé par le front."""
    return f"2026-07-{day:02d}T{hour:02d}:{minute:02d}:00+02:00"


async def direction(clients, email: str = "direction@a.test"):
    owner = clients()
    await login(owner, email)
    return owner


def url(world, nursery: str = "nord") -> str:
    return f"/api/v2/nurseries/{world[nursery].id}/attendance"


async def arrival(tablet, child) -> str:
    response = await tablet.post(f"/api/v2/tablet/children/{child.id}/arrival", json={})
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def journal(owner, world, **params) -> list[dict]:
    response = await owner.get(f"{url(world)}/corrections", params={"from": "2026-07-01", **params})
    assert response.status_code == 200, response.text
    return response.json()


# --- Parcours ----------------------------------------------------------------------

async def test_un_depart_oublie_debloque_la_tablette_le_lendemain(clients, world, clock):
    tablet = await ready_tablet(clients, world)
    presence = await arrival(tablet, world["leo"])
    clock["now"] = MORNING + timedelta(days=1)
    assert (await pin_login(tablet, world["lea"])).status_code == 201
    # Le départ de la veille n'a pas été pointé : la tablette refuse l'arrivée du jour.
    leo = f"/api/v2/tablet/children/{world['leo'].id}/arrival"
    assert (await tablet.post(leo, json={})).status_code == 409

    owner = await direction(clients)
    response = await owner.patch(f"{url(world)}/{presence}",
                                 json={"departed_at": paris(17, 45), "picked_up_by": str(world["alice"].id),
                                       "reason": REASON})
    assert response.status_code == 200, response.text
    corrected = response.json()
    assert corrected["departed_at"].startswith("2026-07-15T15:45")
    assert corrected["picked_up_by"] == "Alice G." and corrected["departure_by"] is None
    assert corrected["corrected"] is True and corrected["arrival_by"] == "Lea T."

    assert (await tablet.post(leo, json={})).status_code == 201
    [entry] = await journal(owner, world)
    assert entry["kind"] == "modified" and entry["reason"] == REASON and entry["attendance_id"] == presence
    assert entry["corrected_by"] == f"Test {world['owner'].last_name}" and entry["child_name"] == "Léo Garnier"
    assert entry["before"]["departed_at"] is None and entry["before"]["picked_up_by"] is None
    assert entry["after"]["departed_at"].startswith("2026-07-15T15:45")
    assert entry["after"]["picked_up_by"] == "Alice G."
    assert entry["corrected_at"].startswith("2026-07-16T07:00")


async def test_heure_corrigee_visible_dans_le_suivi_et_l_export(clients, world, clock):
    tablet = await ready_tablet(clients, world)
    presence = await arrival(tablet, world["leo"])
    await arrival(tablet, world["emma"])
    owner = await direction(clients)
    response = await owner.patch(f"{url(world)}/{presence}",
                                 json={"arrived_at": paris(8, 30), "dropped_off_by": str(world["alice"].id),
                                       "reason": "Pointé en retard, arrivé à 8 h 30"})
    assert response.status_code == 200, response.text
    day = {p["child_name"]: p for p in (await owner.get(url(world))).json()}
    assert day["Léo Garnier"]["arrived_at"].startswith("2026-07-15T06:30")
    assert day["Léo Garnier"]["dropped_off_by"] == "Alice G." and day["Léo Garnier"]["corrected"] is True
    assert day["Emma Lambert"]["corrected"] is False
    csv = (await owner.get(f"{url(world)}/history.csv", params={"from": "2026-07-15"})).text.split("\r\n")
    assert csv[1:3] == ["15/07/2026;Léo Garnier;08:30;Lea T.;Alice G.;;;;oui",
                        "15/07/2026;Emma Lambert;09:00;Lea T.;;;;;"]
    [entry] = await journal(owner, world)
    assert entry["before"]["arrived_at"].startswith("2026-07-15T07:00")
    assert entry["before"]["dropped_off_by"] is None and entry["after"]["dropped_off_by"] == "Alice G."


async def test_presence_oubliee_ajoutee_par_la_direction(clients, world, clock):
    owner = await direction(clients)
    body = {"child_id": str(world["emma"].id), "arrived_at": paris(8, 0, day=14), "departed_at": paris(17, 0, day=14),
            "picked_up_by": str(world["sophie"].id), "reason": "Tablette en panne le 14"}
    response = await owner.post(url(world), json=body)
    assert response.status_code == 201, response.text
    created = response.json()
    assert created["day"] == "2026-07-14" and created["arrival_by"] is None and created["corrected"] is True
    assert created["picked_up_by"] == "Sophie L."
    [entry] = await journal(owner, world)
    assert entry["kind"] == "created" and entry["before"] is None and entry["after"]["picked_up_by"] == "Sophie L."
    # Une seconde fois : elle chevauche la première.
    assert (await owner.post(url(world), json=body)).status_code == 409

    # Arrivée oubliée d'un enfant encore là : sans départ, le jour même seulement.
    still_here = {"child_id": str(world["leo"].id), "arrived_at": paris(8, 15), "reason": "Arrivée oubliée"}
    response = await owner.post(url(world), json=still_here)
    assert response.status_code == 201, response.text
    tablet = await ready_tablet(clients, world)
    assert by_name((await tablet.get("/api/v2/tablet/children")).json())["Léo"]["presence"] == "present"
    assert (await owner.post(url(world), json={**still_here, "arrived_at": paris(8, 45)})).status_code == 409


async def test_presence_pointee_sur_le_mauvais_enfant_annulee(clients, world, clock):
    tablet = await ready_tablet(clients, world)
    wrong = await arrival(tablet, world["leo"])
    owner = await direction(clients)
    response = await owner.post(f"{url(world)}/{wrong}/cancel", json={"reason": "Pointée sur Léo au lieu d'Emma"})
    assert response.status_code == 200, response.text
    entry = response.json()
    assert entry["kind"] == "cancelled" and entry["attendance_id"] is None and entry["after"] is None
    assert entry["before"]["arrived_at"].startswith("2026-07-15T07:00")
    # Elle disparaît du suivi et de la tablette ; le journal la garde.
    assert (await owner.get(url(world))).json() == []
    assert by_name((await tablet.get("/api/v2/tablet/children")).json())["Léo"]["presence"] == "absent"
    assert [e["kind"] for e in await journal(owner, world)] == ["cancelled"]
    assert (await owner.post(f"{url(world)}/{wrong}/cancel", json={"reason": "Deuxième fois"})).status_code == 404
    # Léo peut de nouveau être pointé.
    await arrival(tablet, world["leo"])


async def test_depart_pointe_par_erreur_rouvert_le_jour_meme(clients, world, clock):
    tablet = await ready_tablet(clients, world)
    presence = await arrival(tablet, world["leo"])
    clock["now"] = MORNING + timedelta(minutes=1)
    assert (await tablet.post(f"/api/v2/tablet/children/{world['leo'].id}/departure",
                              json={"picked_up_by": str(world["alice"].id)})).status_code == 200
    owner = await direction(clients)
    response = await owner.patch(f"{url(world)}/{presence}",
                                 json={"departed_at": None, "reason": "Départ pointé sur le mauvais enfant"})
    assert response.status_code == 200, response.text
    reopened = response.json()
    assert reopened["departed_at"] is None and reopened["picked_up_by"] is None and reopened["departure_by"] is None
    assert [p["child_name"] for p in (await owner.get(f"{url(world)}/present")).json()] == ["Léo Garnier"]


# --- Refus -------------------------------------------------------------------------

async def test_seule_la_direction_corrige(clients, world, clock):
    tablet = await ready_tablet(clients, world)
    presence = await arrival(tablet, world["leo"])
    employee = clients()
    await login(employee, "lea@a.test")
    body = {"arrived_at": paris(8, 30), "reason": "Pointé en retard"}
    assert (await employee.patch(f"{url(world)}/{presence}", json=body)).status_code == 403
    assert (await employee.post(f"{url(world)}/{presence}/cancel", json={"reason": "Erreur"})).status_code == 403
    assert (await employee.post(url(world), json={"child_id": str(world["emma"].id), **body})).status_code == 403
    assert (await employee.get(f"{url(world)}/corrections")).status_code == 403
    other = await direction(clients, "direction@b.test")
    assert (await other.patch(f"{url(world)}/{presence}", json=body)).status_code == 404
    assert (await other.get(f"{url(world)}/corrections")).status_code == 404


async def test_presence_d_une_autre_creche_introuvable(clients, world, clock, db):
    # Même entreprise : la direction gère les deux crèches, mais pas sous la mauvaise adresse.
    nina = Attendance(id=uuid.uuid4(), child_id=world["nina"].id, nursery_id=world["sud"].id,
                      day=MORNING.date(), arrived_at=MORNING)
    db.add(nina)
    await db.flush()
    owner = await direction(clients)
    body = {"arrived_at": paris(8, 30), "reason": "Pointée en retard"}
    response = await owner.patch(f"{url(world)}/{nina.id}", json=body)
    assert response.status_code == 404 and response.json()["detail"] == "Présence introuvable dans cette crèche"
    assert (await owner.post(f"{url(world)}/{nina.id}/cancel", json={"reason": "Erreur de crèche"})).status_code \
        == 404
    assert (await owner.post(url(world), json={"child_id": str(world["nina"].id), **body})).status_code == 404
    assert (await owner.patch(f"{url(world, 'sud')}/{nina.id}", json=body)).status_code == 200


@pytest.mark.parametrize(("body", "code", "detail"), [
    ({"reason": "Rien à changer"}, 422, "La correction ne change rien"),
    ({"arrived_at": paris(9, 0), "reason": "Même heure"}, 422, "La correction ne change rien"),
    ({"arrived_at": None, "reason": "Arrivée retirée"}, 422, "L'heure d'arrivée ne peut pas être retirée"),
    ({"arrived_at": paris(23, 30, day=14), "reason": "Arrivée la veille"}, 422,
     "L'arrivée doit rester le jour de la présence"),
    ({"arrived_at": paris(9, 30), "reason": "Arrivée plus tard"}, 422,
     "Une heure corrigée ne peut pas être dans le futur"),
    ({"departed_at": paris(8, 0), "reason": "Parti avant d'arriver"}, 422, "Le départ précède l'arrivée"),
    ({"picked_up_by": "ALICE", "reason": "Personne sans départ"}, 422,
     "Une personne venue chercher l'enfant suppose une heure de départ"),
    ({"departed_at": paris(9, 0), "picked_up_by": "JEANNE", "reason": "Parti avec Jeanne"}, 403,
     "Cette personne n'est pas autorisée à venir chercher l'enfant : prévenir la direction"),
    ({"departed_at": paris(9, 0), "picked_up_by": "SOPHIE", "reason": "Parti avec Sophie"}, 422,
     "Cette personne n'est pas un responsable de l'enfant"),
    ({"dropped_off_by": "SOPHIE", "reason": "Amené par Sophie"}, 422,
     "Cette personne n'est pas un responsable de l'enfant"),
])
async def test_correction_refusee_sans_rien_ecrire(clients, world, clock, db, body, code, detail):
    tablet = await ready_tablet(clients, world)
    presence = await arrival(tablet, world["leo"])
    owner = await direction(clients)
    guardians = {"ALICE": world["alice"], "JEANNE": world["jeanne"], "SOPHIE": world["sophie"]}
    body = {key: str(guardians[value].id) if value in guardians else value for key, value in body.items()}
    response = await owner.patch(f"{url(world)}/{presence}", json=body)
    assert response.status_code == code, response.text
    assert response.json()["detail"] == detail
    assert await db.scalar(select(func.count()).select_from(AttendanceCorrection)) == 0
    stored = await db.get(Attendance, uuid.UUID(presence))
    await db.refresh(stored)
    assert stored.arrived_at == MORNING and stored.departed_at is None and stored.dropped_off_by is None


@pytest.mark.parametrize("reason", ["", "ok", "    "])
async def test_motif_obligatoire(clients, world, clock, reason):
    tablet = await ready_tablet(clients, world)
    presence = await arrival(tablet, world["leo"])
    owner = await direction(clients)
    assert (await owner.patch(f"{url(world)}/{presence}",
                              json={"arrived_at": paris(8, 30), "reason": reason})).status_code == 422
    assert (await owner.patch(f"{url(world)}/{presence}", json={"arrived_at": paris(8, 30)})).status_code == 422


async def test_presence_oubliee_refusee(clients, world, clock):
    owner = await direction(clients)

    async def add(child, **fields):
        body = {"child_id": str(world[child].id), "arrived_at": paris(8, 0, day=14),
                "departed_at": paris(17, 0, day=14), "reason": "Tablette en panne", **fields}
        return await owner.post(url(world), json=body)

    assert (await add("leo", departed_at=None)).json()["detail"] \
        == "Une présence d'un jour passé doit avoir une heure de départ"
    assert (await add("futur")).status_code == 409  # pas encore inscrit le 14 juillet
    assert (await add("leo", picked_up_by=str(world["jeanne"].id))).status_code == 403
    assert (await add("leo", arrived_at=paris(8, 0, day=16), departed_at=None)).json()["detail"] \
        == "Une heure corrigée ne peut pas être dans le futur"
    assert (await add("leo", child_id=str(uuid.uuid4()))).status_code == 404


async def test_presence_de_plus_de_31_jours_ne_se_corrige_plus(clients, world, clock):
    tablet = await ready_tablet(clients, world)
    presence = await arrival(tablet, world["leo"])
    body = {"departed_at": paris(17, 0), "reason": "Départ oublié"}
    # Connexion après le saut d'horloge : une session ouverte 32 jours plus tôt aurait expiré.
    clock["now"] = MORNING + timedelta(days=32)
    owner = await direction(clients)
    response = await owner.patch(f"{url(world)}/{presence}", json=body)
    assert response.status_code == 409 and response.json()["detail"] == \
        "Présence de plus de 31 jours : elle ne se corrige plus"
    assert (await owner.post(f"{url(world)}/{presence}/cancel", json={"reason": "Erreur"})).status_code == 409
    clock["now"] = MORNING + timedelta(days=31)
    owner = await direction(clients)
    assert (await owner.patch(f"{url(world)}/{presence}", json=body)).status_code == 200


async def test_journal_par_periode_et_par_creche(clients, world, clock, db):
    owner = await direction(clients)
    for day in (14, 10):
        clock["now"] += timedelta(minutes=1)  # une correction après l'autre
        response = await owner.post(url(world), json={
            "child_id": str(world["emma"].id), "arrived_at": paris(8, 0, day=day),
            "departed_at": paris(17, 0, day=day), "reason": f"Oubli du {day}"})
        assert response.status_code == 201, response.text
    clock["now"] += timedelta(minutes=1)
    response = await owner.post(url(world, "sud"), json={
        "child_id": str(world["nina"].id), "arrived_at": paris(8, 0, day=14), "departed_at": paris(17, 0, day=14),
        "reason": "Oubli à la crèche Sud"})
    assert response.status_code == 201, response.text
    # Par défaut : les 7 derniers jours (du 9 au 15 juillet), crèche Nord seulement.
    entries = (await owner.get(f"{url(world)}/corrections")).json()
    # Dans l'ordre des corrections, pas des jours.
    assert [e["reason"] for e in entries] == ["Oubli du 14", "Oubli du 10"]
    assert [e["reason"] for e in await journal(owner, world, **{"from": "2026-07-12"})] == ["Oubli du 14"]
    assert (await owner.get(f"{url(world)}/corrections", params={"from": "2026-07-16", "to": "2026-07-15"})) \
        .status_code == 422


async def test_le_journal_ne_se_vide_pas_avec_la_presence(world, db):
    """Une présence supprimée (annulation, enfant supprimé) : la ligne de journal garde ce qu'elle contenait."""
    attendance = Attendance(id=uuid.uuid4(), child_id=world["leo"].id, nursery_id=world["nord"].id,
                            day=MORNING.date(), arrived_at=MORNING)
    db.add(attendance)
    await db.flush()
    db.add(AttendanceCorrection(id=uuid.uuid4(), nursery_id=world["nord"].id, child_id=world["leo"].id,
                                attendance_id=attendance.id, child_name="Léo Garnier", day=MORNING.date(),
                                kind=CorrectionKind.MODIFIED, reason="Heure corrigée", corrected_at=datetime.now(UTC),
                                corrected_by_name="Test", old_arrived_at=MORNING, new_arrived_at=MORNING))
    await db.flush()
    await db.delete(attendance)
    await db.flush()
    entry = await db.scalar(select(AttendanceCorrection))
    await db.refresh(entry)
    assert entry.attendance_id is None and entry.reason == "Heure corrigée"


async def test_depart_et_correction_verrouillent_la_presence(clients, world, clock, db):
    """Un départ pointé sur la tablette et une correction simultanés ne s'écrasent pas.

    La session de test est unique : le verrou est vérifié sur les requêtes envoyées (FOR UPDATE).
    """
    tablet = await ready_tablet(clients, world)
    presence = await arrival(tablet, world["leo"])
    owner = await direction(clients)
    connection = (await db.connection()).sync_connection
    statements: list[str] = []

    def capture(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    async def locks(request) -> set[str]:
        statements.clear()
        event.listen(connection, "before_cursor_execute", capture)
        try:
            assert (await request).status_code == 200
        finally:
            event.remove(connection, "before_cursor_execute", capture)
        return {table for statement in statements if "FOR UPDATE" in statement
                for table in ("child", "attendance") if f"FROM {table} " in statement}

    assert await locks(owner.patch(f"{url(world)}/{presence}", json={"arrived_at": paris(8, 30),
                                                                    "reason": "Pointé en retard"})) \
        == {"child", "attendance"}
    assert await locks(tablet.post(f"/api/v2/tablet/children/{world['leo'].id}/departure",
                                   json={"picked_up_by": str(world["alice"].id)})) == {"attendance"}
