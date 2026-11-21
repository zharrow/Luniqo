"""Contrat HTTP de GET /api/v2/to-do (LUN-153) et contrôle d'accès, sans base de données."""

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.openapi import documented_codes
from app.todo.policy import LockedPin, NurseryRef, OpenPresence, TabletFact
from tests.nurseries.conftest import NOW
from tests.todo.fakes import INCOMPLETE

URL = "/api/v2/to-do"


def _ref(world, key) -> NurseryRef:
    nursery = world.nurseries[key]
    return NurseryRef(nursery.id, nursery.name)


def test_liste_triee_de_toutes_les_creches_actives(as_user, world, todo):
    nord, sud = _ref(world, "nord"), _ref(world, "sud")
    employee = world.users["employee_nord"]
    todo.pins.append(LockedPin(nord, employee.id, "Employé Nord", True, NOW - timedelta(hours=3)))
    todo.tablet_facts.append(TabletFact(sud, uuid.uuid4(), "Entrée", NOW + timedelta(days=2), None))
    child = uuid.uuid4()
    todo.presences.append(OpenPresence(sud, child, "Léo Fictif", date(2026, 10, 7),
                                       datetime(2026, 10, 7, 6, 45, tzinfo=UTC)))
    todo.onboarding_facts[world.nurseries["nord"].id] = INCOMPLETE
    response = as_user("owner_a").get(URL)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 4
    assert [item["kind"] for item in body["items"]] == [
        "pin_locked", "departure_missing", "tablet_expiring", "onboarding_incomplete"]
    assert body["items"][0] == {
        "kind": "pin_locked", "nursery_id": str(nord.id), "nursery_name": "Crèche nord",
        "subject_id": str(employee.id), "subject_name": "Employé Nord", "since": "2026-10-08T06:00:00Z", "day": None}
    assert body["items"][1] | {"since": None} == {
        "kind": "departure_missing", "nursery_id": str(sud.id), "nursery_name": "Crèche sud",
        "subject_id": str(child), "subject_name": "Léo Fictif", "since": None, "day": "2026-10-07"}
    assert body["items"][3]["subject_id"] == str(nord.id)
    assert body["items"][3]["since"] == "2026-09-01T08:00:00Z"


def test_creche_fermee_et_autre_entreprise_absentes(as_user, world, todo):
    for key in ("fermee", "temoin"):
        todo.pins.append(LockedPin(_ref(world, key), uuid.uuid4(), key, True, NOW))
        todo.onboarding_facts[world.nurseries[key].id] = INCOMPLETE
    assert as_user("owner_a").get(URL).json() == {"items": [], "total": 0}
    assert set(todo.read) == {world.nurseries["nord"].id, world.nurseries["sud"].id}


def test_filtre_par_creche(as_user, world, todo):
    for key in ("nord", "sud"):
        todo.onboarding_facts[world.nurseries[key].id] = INCOMPLETE
    response = as_user("owner_a").get(URL, params={"nursery_id": str(world.nurseries["sud"].id)})
    assert response.status_code == 200
    assert [item["nursery_name"] for item in response.json()["items"]] == ["Crèche sud"]


def test_creche_fermee_demandee_liste_vide(as_user, world, todo):
    todo.onboarding_facts[world.nurseries["fermee"].id] = INCOMPLETE
    response = as_user("owner_a").get(URL, params={"nursery_id": str(world.nurseries["fermee"].id)})
    assert response.json() == {"items": [], "total": 0}


def test_direction_sans_creche(as_user, world, todo):
    world.repo.nurseries.clear()
    assert as_user("owner_a").get(URL).json() == {"items": [], "total": 0}


@pytest.mark.parametrize("nursery", ["temoin", None])
def test_creche_d_une_autre_entreprise_ou_inexistante(as_user, world, todo, monkeypatch, nursery):
    async def forbidden_read(*args):
        pytest.fail("Rien ne doit être lu avant l'autorisation")

    monkeypatch.setattr(todo, "locked_pins", forbidden_read)
    nursery_id = world.nurseries[nursery].id if nursery else uuid.uuid4()
    response = as_user("owner_a").get(URL, params={"nursery_id": str(nursery_id)})
    assert response.status_code == 404
    assert response.json() == {"detail": "Crèche introuvable", "code": "nursery_not_found"}


@pytest.mark.parametrize("key", ["employee_nord", "developer", "guardian"])
def test_reservee_a_la_direction(as_user, todo, monkeypatch, key):
    async def forbidden_read(*args):
        pytest.fail("Rien ne doit être lu avant l'autorisation")

    monkeypatch.setattr(todo, "locked_pins", forbidden_read)
    response = as_user(key).get(URL)
    assert response.status_code == 403
    assert response.json() == {"detail": "Action non autorisée pour ce rôle", "code": "role_refused"}


def test_sans_session(todo):
    assert TestClient(app, base_url="https://testserver").get(URL).status_code == 401


def test_exige_le_second_facteur(as_user, todo):
    response = as_user("owner_a", complete_mfa=False).get(URL)
    assert response.status_code == 403
    assert response.json()["code"] == "mfa_required"


def test_identifiant_invalide(as_user, todo):
    response = as_user("owner_a").get(URL, params={"nursery_id": "invalide"})
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_documente_sa_session_ses_erreurs_et_un_exemple():
    operation = app.openapi()["paths"][URL]["get"]
    assert operation["security"] == [{"webSession": []}]
    responses = operation["responses"]
    assert set(responses) == {"200", "401", "403", "404", "422", "500"}
    assert documented_codes(responses["404"]) == {"nursery_not_found"}
    assert documented_codes(responses["403"]) == {"mfa_required", "role_refused"}
    schema = app.openapi()["components"]["schemas"]["ToDoList"]
    assert schema["examples"][0]["total"] == len(schema["examples"][0]["items"])
