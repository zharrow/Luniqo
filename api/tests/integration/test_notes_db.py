"""Transmissions de la journée sur PostgreSQL (LUN-146) : écriture, lecture du jour, refus et isolation."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.auth.models import UserRole
from app.notes.models import ChildNote
from tests.integration import test_attendance_db as attendance
from tests.integration.conftest import login
from tests.integration.test_attendance_db import MORNING

pytestmark = pytest.mark.anyio

# Mêmes crèches, enfants et horloge que les tests du pointage : 9 h à Paris le 15 juillet 2026.
world = attendance.world
clock = attendance.clock


@pytest.fixture(autouse=True)
def fixed_clock(clock):
    return clock

LEO_NOTE = "A bien mangé, sieste de 13 h à 15 h"


def notes_url(world, nursery: str = "nord") -> str:
    return f"/api/v2/nurseries/{world[nursery].id}/notes"


def write_url(world, child: str, nursery: str = "nord") -> str:
    return f"/api/v2/nurseries/{world[nursery].id}/children/{world[child].id}/notes"


async def signed_in(clients, email: str):
    client = clients()
    assert (await login(client, email)).status_code == 200
    return client


async def write(client, world, child: str, note: str, **extra):
    response = await client.post(write_url(world, child), json={"text": note, **extra})
    assert response.status_code == 201, response.text
    return response.json()


# --- Écriture ----------------------------------------------------------------------

async def test_une_employee_note_une_transmission_heure_jour_et_auteur_du_serveur(clients, world, db):
    lea = await signed_in(clients, "lea@a.test")
    note = await write(lea, world, "leo", f"  {LEO_NOTE}  ")
    assert note["text"] == LEO_NOTE
    assert note["author"] == "Lea T." and note["child_name"] == "Léo Garnier"
    assert note["created_at"].startswith("2026-07-15T07:00") and note["day"] == "2026-07-15"
    stored = await db.get(ChildNote, uuid.UUID(note["id"]))
    assert stored.author_id == world["lea"].id and stored.nursery_id == world["nord"].id


async def test_l_ecran_ne_fixe_ni_l_heure_ni_le_jour_ni_l_auteur(clients, world):
    lea = await signed_in(clients, "lea@a.test")
    forged = {"day": "2026-01-01", "created_at": "2026-01-01T08:00:00Z", "author": "Quelqu'un d'autre"}
    response = await lea.post(write_url(world, "leo"), json={"text": LEO_NOTE, **forged})
    assert response.status_code == 422
    assert set(response.json()["fields"]) == set(forged)


async def test_la_direction_ecrit_aussi(clients, world):
    owner = await signed_in(clients, "direction@a.test")
    assert (await write(owner, world, "emma", "Un peu fatiguée ce matin"))["author"] == "Test d."


async def test_transmission_a_0_h_30_comptee_pour_ce_jour_la(clients, world, clock):
    # 0 h 30 à Paris le 16 juillet = 22 h 30 UTC le 15.
    clock["now"] = datetime(2026, 7, 15, 22, 30, tzinfo=UTC)
    lea = await signed_in(clients, "lea@a.test")
    assert (await write(lea, world, "leo", "Réveil la nuit"))["day"] == "2026-07-16"
    assert [n["text"] for n in (await lea.get(notes_url(world))).json()] == ["Réveil la nuit"]
    assert (await lea.get(notes_url(world), params={"day": "2026-07-15"})).json() == []


@pytest.mark.parametrize(("note", "message"), [
    ("", "La transmission ne peut pas être vide"),
    ("   \n\t ", "La transmission ne peut pas être vide"),
    ("x" * 501, "Au plus 500 caractères"),
])
async def test_saisie_refusee_sous_le_champ(clients, world, db, note, message):
    lea = await signed_in(clients, "lea@a.test")
    response = await lea.post(write_url(world, "leo"), json={"text": note})
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert response.json()["fields"] == {"text": message}
    assert await db.scalar(select(ChildNote).limit(1)) is None


async def test_500_caracteres_acceptes(clients, world):
    lea = await signed_in(clients, "lea@a.test")
    assert len((await write(lea, world, "leo", "x" * 500))["text"]) == 500


@pytest.mark.parametrize("child", ["nina", None])
async def test_enfant_d_une_autre_creche_ou_inconnu_introuvable(clients, world, child):
    lea = await signed_in(clients, "lea@a.test")
    child_id = world[child].id if child else uuid.uuid4()
    response = await lea.post(f"/api/v2/nurseries/{world['nord'].id}/children/{child_id}/notes",
                              json={"text": LEO_NOTE})
    assert response.status_code == 404
    assert response.json() == {"detail": "Enfant introuvable dans cette crèche", "code": "child_not_found"}


# --- Lecture -----------------------------------------------------------------------

async def test_transmissions_du_jour_les_plus_recentes_d_abord_sans_celles_d_hier(clients, world, clock):
    clock["now"] = MORNING - timedelta(days=1)
    await write(await signed_in(clients, "lea@a.test"), world, "leo", "Hier : bonne journée")
    clock["now"] = MORNING
    lea = await signed_in(clients, "lea@a.test")
    for minutes, child, note in ((0, "leo", "Arrivé de bonne humeur"), (5, "emma", "A bien mangé"),
                                 (10, "leo", LEO_NOTE)):
        clock["now"] = MORNING + timedelta(minutes=minutes)
        await write(lea, world, child, note)

    owner = await signed_in(clients, "direction@a.test")
    response = await owner.get(notes_url(world))
    assert response.status_code == 200, response.text
    assert [(n["child_name"], n["text"]) for n in response.json()] == [
        ("Léo Garnier", LEO_NOTE), ("Emma Lambert", "A bien mangé"), ("Léo Garnier", "Arrivé de bonne humeur")]

    yesterday = (await owner.get(notes_url(world), params={"day": "2026-07-14"})).json()
    assert [n["text"] for n in yesterday] == ["Hier : bonne journée"]


async def test_jour_mal_forme_refuse(clients, world):
    lea = await signed_in(clients, "lea@a.test")
    response = await lea.get(notes_url(world), params={"day": "19/11/2026"})
    assert response.status_code == 422
    assert response.json()["fields"] == {"day": "Date invalide (AAAA-MM-JJ)"}


# --- Accès et isolation -------------------------------------------------------------

async def test_transmissions_d_une_autre_creche_jamais_lues(clients, world, db, data):
    # Une collègue de « Sud » écrit sur Nina : rien ne déborde sur « Nord ».
    sud = await data.user("sud@a.test", UserRole.EMPLOYEE, world["a"])
    await data.grant(sud, world["sud"])
    other = await signed_in(clients, "sud@a.test")
    response = await other.post(write_url(world, "nina", "sud"), json={"text": "Transmission de Sud"})
    assert response.status_code == 201, response.text
    lea = await signed_in(clients, "lea@a.test")
    assert (await lea.get(notes_url(world))).json() == []


@pytest.mark.parametrize("email", ["sans_acces@a.test", "direction@b.test"])
async def test_sans_acces_ou_autre_entreprise_introuvable(clients, world, email):
    client = await signed_in(clients, email)
    for response in (await client.get(notes_url(world)),
                     await client.post(write_url(world, "leo"), json={"text": LEO_NOTE})):
        assert response.status_code == 404
        assert response.json() == {"detail": "Crèche introuvable", "code": "nursery_not_found"}


async def test_une_famille_n_y_a_pas_acces(clients, world, data):
    await data.user("parent@a.test", UserRole.GUARDIAN)
    parent = await signed_in(clients, "parent@a.test")
    for response in (await parent.get(notes_url(world)),
                     await parent.post(write_url(world, "leo"), json={"text": LEO_NOTE})):
        assert response.status_code == 403
        assert response.json()["code"] == "role_refused"


async def test_sans_session(clients, world):
    client = clients()
    assert (await client.get(notes_url(world))).status_code == 401
    assert (await client.post(write_url(world, "leo"), json={"text": LEO_NOTE})).status_code == 401


# --- Contraintes de la base ---------------------------------------------------------

async def test_la_base_refuse_un_enfant_d_une_autre_creche(db, world):
    with pytest.raises(IntegrityError, match="fk_child_note_child_nursery"):
        async with db.begin_nested():
            db.add(ChildNote(id=uuid.uuid4(), nursery_id=world["nord"].id, child_id=world["nina"].id,
                             day=MORNING.date(), text="Mauvaise crèche", author_name="Lea T.", created_at=MORNING))
            await db.flush()


async def test_la_base_refuse_une_transmission_vide(db, world):
    with pytest.raises(IntegrityError, match="child_note_text_length"):
        async with db.begin_nested():
            db.add(ChildNote(id=uuid.uuid4(), nursery_id=world["nord"].id, child_id=world["leo"].id,
                             day=MORNING.date(), text="   ", author_name="Lea T.", created_at=MORNING))
            await db.flush()


async def test_le_nom_de_l_auteur_reste_apres_la_suppression_de_son_compte(clients, world, db):
    lea = await signed_in(clients, "lea@a.test")
    note = await write(lea, world, "leo", LEO_NOTE)
    await db.execute(text("DELETE FROM app_user WHERE id = :id"), {"id": world["lea"].id})
    owner = await signed_in(clients, "direction@a.test")
    [kept] = (await owner.get(notes_url(world))).json()
    assert kept["id"] == note["id"] and kept["author"] == "Lea T."
