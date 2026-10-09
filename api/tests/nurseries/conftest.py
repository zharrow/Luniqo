"""Monde de test : deux entreprises, toutes les sortes de comptes, des accès partiels."""

import uuid
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_now, get_repository
from app.auth.models import AppUser, UserRole
from app.auth.passwords import hash_password_sync
from app.auth.tokens import token_digest
from app.main import app
from app.nurseries.dependencies import get_nursery_repository
from app.nurseries.models import Nursery, NurseryAccess
from tests.auth.conftest import ORIGIN, PASSWORD
from tests.auth.fakes import InMemoryAuthRepository
from tests.nurseries.fakes import InMemoryNurseryRepository

# Un seul calcul Argon2 pour tous les comptes : les tests restent rapides.
PASSWORD_HASH = hash_password_sync(PASSWORD)
NOW = datetime(2026, 10, 8, 9, 0, tzinfo=UTC)


@dataclass
class World:
    auth: InMemoryAuthRepository
    repo: InMemoryNurseryRepository
    enterprise_a: uuid.UUID
    enterprise_b: uuid.UUID
    nurseries: dict[str, Nursery]
    users: dict[str, AppUser]


def _user(auth, key, email, role, enterprise_id, users):
    users[key] = auth.add_user(AppUser(id=uuid.uuid4(), email=email, password_hash=PASSWORD_HASH, first_name=key,
                                       last_name="Test", role=role, enterprise_id=enterprise_id, is_active=True))


@pytest.fixture
def world() -> World:
    auth = InMemoryAuthRepository()
    repo = InMemoryNurseryRepository(auth)
    a, b = uuid.uuid4(), uuid.uuid4()
    nurseries = {}
    for key, enterprise, active in (("nord", a, True), ("sud", a, True), ("fermee", a, False), ("temoin", b, True)):
        nurseries[key] = Nursery(id=uuid.uuid4(), enterprise_id=enterprise, name=f"Crèche {key}", city="Toulouse",
                                 capacity=12, is_active=active)
        repo.add(nurseries[key])
    users: dict[str, AppUser] = {}
    _user(auth, "owner_a", "direction@demo.test", UserRole.OWNER, a, users)
    _user(auth, "employee_nord", "employe@demo.test", UserRole.EMPLOYEE, a, users)
    _user(auth, "employee_sud", "employe.sud@demo.test", UserRole.EMPLOYEE, a, users)
    _user(auth, "employee_none", "sans.acces@demo.test", UserRole.EMPLOYEE, a, users)
    _user(auth, "owner_b", "direction@temoin.test", UserRole.OWNER, b, users)
    _user(auth, "employee_b", "employe@temoin.test", UserRole.EMPLOYEE, b, users)
    _user(auth, "developer", "dev@luniqo.test", UserRole.DEVELOPER, None, users)
    _user(auth, "guardian", "parent@demo.test", UserRole.GUARDIAN, None, users)
    for user_key, nursery_key in (("employee_nord", "nord"), ("employee_nord", "fermee"),
                                  ("employee_sud", "sud"), ("employee_b", "temoin")):
        nursery = nurseries[nursery_key]
        repo.grant(NurseryAccess(user_id=users[user_key].id, nursery_id=nursery.id,
                                 enterprise_id=nursery.enterprise_id))
    return World(auth, repo, a, b, nurseries, users)


@pytest.fixture
def as_user(world: World) -> Iterator[Callable[[str], TestClient]]:
    """Fabrique un client HTTP connecté sous le compte demandé (clé du monde de test)."""

    async def override_auth():
        return world.auth

    async def override_nurseries():
        return world.repo

    async def override_now():
        return NOW

    app.dependency_overrides[get_repository] = override_auth
    app.dependency_overrides[get_nursery_repository] = override_nurseries
    app.dependency_overrides[get_now] = override_now

    def make(key: str, *, complete_mfa: bool = True) -> TestClient:
        client = TestClient(app, base_url="https://testserver")
        response = client.post("/api/v2/auth/login", json={"email": world.users[key].email, "password": PASSWORD},
                               headers=ORIGIN)
        assert response.status_code == 200, response.text
        if complete_mfa and response.json()["mfa"] != "not_required":
            # Direction et éditeur : second facteur considéré comme présenté
            # (raccourci de test ; le parcours réel est testé dans test_mfa_db.py).
            world.auth.complete_second_factor(token_digest(client.cookies["__Host-luniqo_session"]), NOW)
        return client

    yield make
    app.dependency_overrides.clear()
