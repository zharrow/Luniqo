import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_now, get_repository
from app.auth.models import AppUser, UserRole
from app.auth.passwords import hash_password_sync
from app.main import app
from tests.auth.fakes import InMemoryAuthRepository

PASSWORD = "une phrase de passe assez longue"
ORIGIN = {"Origin": "http://localhost:8080"}


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 10, 8, 9, 0, tzinfo=UTC)

    def advance(self, **delta: float) -> None:
        self.now += timedelta(**delta)


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def repo() -> InMemoryAuthRepository:
    repository = InMemoryAuthRepository()
    repository.add_user(AppUser(id=uuid.uuid4(), email="direction@demo.test", password_hash=hash_password_sync(PASSWORD),
                                first_name="Camille", last_name="Martin", role=UserRole.OWNER, is_active=True))
    return repository


@pytest.fixture
def client(repo: InMemoryAuthRepository, clock: Clock) -> Iterator[TestClient]:
    async def override_repository():
        return repo

    async def override_now():
        return clock.now

    app.dependency_overrides[get_repository] = override_repository
    app.dependency_overrides[get_now] = override_now
    # HTTPS : le client de test, comme un navigateur, ne renvoie un cookie Secure qu'en HTTPS.
    yield TestClient(app, base_url="https://testserver")
    app.dependency_overrides.clear()


def login(client: TestClient, email: str = "direction@demo.test", password: str = PASSWORD):
    return client.post("/api/v2/auth/login", json={"email": email, "password": password}, headers=ORIGIN)
