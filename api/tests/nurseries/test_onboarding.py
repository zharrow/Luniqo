"""Contrat HTTP de la mise en route (LUN-128) et contrôle d'accès, sans base de données."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.nurseries.policy import OnboardingFacts, StaffAccess, Tablet
from app.openapi import documented_codes
from tests.nurseries.conftest import NOW


def _url(nursery_id) -> str:
    return f"/api/v2/nurseries/{nursery_id}/onboarding"


def test_direction_voit_deux_succes_sur_trois(as_user, world):
    nord = world.nurseries["nord"].id
    world.repo.onboarding[nord] = OnboardingFacts(
        accesses=[StaffAccess(datetime(2026, 10, 3, 9, 0, tzinfo=UTC), True)],
        tablets=[Tablet(datetime(2026, 10, 5, 8, 30, tzinfo=UTC), NOW + timedelta(days=60), None)],
        first_arrival=None,
    )
    response = as_user("owner_a").get(_url(nord))
    assert response.status_code == 200
    assert response.json() == {"steps": [
        {"milestone": "staff", "achieved": True, "achieved_at": "2026-10-03T09:00:00Z"},
        {"milestone": "tablet", "achieved": True, "achieved_at": "2026-10-05T08:30:00Z"},
        {"milestone": "first_attendance", "achieved": False, "achieved_at": None},
    ]}


def test_tablette_expiree_a_l_heure_de_l_api(as_user, world):
    # L'expiration se juge à l'heure de l'API (NOW du monde de test), pas à celle de la machine.
    nord = world.nurseries["nord"].id
    world.repo.onboarding[nord] = OnboardingFacts(
        accesses=[], tablets=[Tablet(NOW - timedelta(days=90), NOW, None)], first_arrival=None)
    steps = as_user("owner_a").get(_url(nord)).json()["steps"]
    assert steps[1] == {"milestone": "tablet", "achieved": False, "achieved_at": None}


def test_creche_neuve(as_user, world):
    response = as_user("owner_a").get(_url(world.nurseries["sud"].id))
    assert response.status_code == 200
    assert [step["achieved"] for step in response.json()["steps"]] == [False, False, False]


@pytest.mark.parametrize(("key", "nursery", "expected", "code"), [
    ("employee_nord", "nord", 403, "manager_required"),
    ("employee_nord", "sud", 404, "nursery_not_found"),
    ("employee_none", "nord", 404, "nursery_not_found"),
    ("owner_a", "temoin", 404, "nursery_not_found"),
    ("owner_b", "nord", 404, "nursery_not_found"),
    ("developer", "nord", 403, "role_refused"),
    ("guardian", "nord", 403, "role_refused"),
])
def test_reservee_a_la_direction_de_la_creche(as_user, world, monkeypatch, key, nursery, expected, code):
    async def forbidden_read(*args):
        pytest.fail("Les faits ne doivent pas être lus avant l'autorisation")

    monkeypatch.setattr(world.repo, "get_onboarding_facts", forbidden_read)
    client = as_user(key)
    response = client.get(_url(world.nurseries[nursery].id))
    assert response.status_code == expected
    assert response.json()["code"] == code
    if expected == 404:
        missing = client.get(_url(uuid.uuid4()))
        assert response.json() == missing.json() == {"detail": "Crèche introuvable", "code": "nursery_not_found"}


def test_sans_session(world):
    response = TestClient(app, base_url="https://testserver").get(_url(world.nurseries["nord"].id))
    assert response.status_code == 401


def test_documente_sa_session_et_ses_erreurs():
    operation = app.openapi()["paths"]["/api/v2/nurseries/{nursery_id}/onboarding"]["get"]
    assert operation["security"] == [{"webSession": []}]
    responses = operation["responses"]
    assert set(responses) == {"200", "401", "403", "404", "422", "500"}
    assert "nursery_not_found" in documented_codes(responses["404"])
    assert documented_codes(responses["403"]) == {"mfa_required", "role_refused", "manager_required"}
