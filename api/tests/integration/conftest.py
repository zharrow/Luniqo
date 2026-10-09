"""Tests d'intégration sur une vraie PostgreSQL (LUN-007).

Lancés seulement si TEST_DB_ADDR est défini (scripts/test-db.sh up) ; sinon
ignorés, pour que `pytest` reste utilisable sans base.

- La base est remise à zéro au début de la session : migrations appliquées,
  annulées jusqu'à la base vide, puis réappliquées (réversibilité testée).
  Par sécurité, son nom doit finir par `_test`.
- Chaque test s'exécute dans une transaction annulée à la fin. Les commit du
  code testé deviennent des points de sauvegarde (join_transaction_mode) :
  les tests ne laissent rien et ne se voient pas entre eux.
"""

import os
import uuid
from collections.abc import AsyncIterator

import httpx2
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.auth.models import AppUser, UserRole
from app.auth.passwords import hash_password_sync
from app.config import get_settings
from app.db import get_engine, get_session, new_session
from app.main import app
from app.nurseries.models import Enterprise, Nursery, NurseryAccess
from tests.auth.conftest import ORIGIN, PASSWORD

API_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PASSWORD_HASH = hash_password_sync(PASSWORD)


def pytest_collection_modifyitems(config, items):
    for item in items:
        if "tests/integration/" in item.nodeid:
            item.add_marker(pytest.mark.integration)
            if not os.environ.get("TEST_DB_ADDR"):
                if os.environ.get("CI"):
                    # En CI, des tests d'intégration ignorés en silence donneraient une CI verte à tort.
                    pytest.exit("TEST_DB_ADDR absent en CI : les tests d'intégration doivent tourner", returncode=2)
                item.add_marker(pytest.mark.skip(reason="TEST_DB_ADDR absent : lancer scripts/test-db.sh up"))


@pytest.fixture(scope="session")
def database_url() -> str:
    name = os.environ.get("TEST_DB_NAME", "luniqo_test")
    if not name.endswith("_test"):
        # Garde-fou (règle 6 d'AGENTS.md) : la base est vidée, jamais une autre que celle de test.
        pytest.exit(f"TEST_DB_NAME={name!r} refusé : le nom d'une base de test doit finir par _test", returncode=2)
    os.environ.update({
        "DB_ADDR": os.environ["TEST_DB_ADDR"],
        "DB_NAME": name,
        "DB_USER": os.environ.get("TEST_DB_USER", "luniqo"),
        "DB_PASSWORD": os.environ.get("TEST_DB_PASSWORD", ""),
    })
    os.environ.pop("DB_PASSWORD_FILE", None)
    get_settings.cache_clear()
    get_engine.cache_clear()
    alembic = Config(os.path.join(API_DIR, "alembic.ini"))
    command.downgrade(alembic, "base")
    command.upgrade(alembic, "head")
    command.downgrade(alembic, "base")
    command.upgrade(alembic, "head")
    return get_settings().database_url


@pytest.fixture
async def db(database_url: str) -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(database_url, poolclass=NullPool)
    async with engine.connect() as connection:
        transaction = await connection.begin()
        # Même fabrique que l'application : un réglage de session défaillant se voit ici.
        session = new_session(connection, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            await session.close()
            await transaction.rollback()
    await engine.dispose()


@pytest.fixture
async def http(db: AsyncSession) -> AsyncIterator[httpx2.AsyncClient]:
    """Client HTTP vers l'application, branchée sur la session de test (même boucle, même transaction)."""

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="https://testserver",
                                  headers=ORIGIN) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
async def clients(db: AsyncSession) -> AsyncIterator:
    """Fabrique de clients HTTP indépendants (un par appareil : tablette, poste de la direction…)."""

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    opened: list[httpx2.AsyncClient] = []

    def make() -> httpx2.AsyncClient:
        client = httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="https://testserver",
                                    headers=ORIGIN)
        opened.append(client)
        return client

    yield make
    for client in opened:
        await client.aclose()
    app.dependency_overrides.clear()


async def login(client: httpx2.AsyncClient, email: str, password: str = PASSWORD) -> httpx2.Response:
    return await client.post("/api/v2/auth/login", json={"email": email, "password": password})


class Data:
    """Jeu de données minimal inséré dans la transaction du test."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def enterprise(self, name: str) -> Enterprise:
        enterprise = Enterprise(id=uuid.uuid4(), name=name)
        self.db.add(enterprise)
        await self.db.flush()
        return enterprise

    async def nursery(self, enterprise: Enterprise, name: str, *, active: bool = True) -> Nursery:
        nursery = Nursery(id=uuid.uuid4(), enterprise_id=enterprise.id, name=name, city="Toulouse", capacity=12,
                          is_active=active)
        self.db.add(nursery)
        await self.db.flush()
        return nursery

    async def user(self, email: str, role: UserRole, enterprise: Enterprise | None = None) -> AppUser:
        user = AppUser(id=uuid.uuid4(), email=email, password_hash=PASSWORD_HASH, first_name="Test", last_name=email,
                       role=role, enterprise_id=enterprise.id if enterprise else None, is_active=True)
        self.db.add(user)
        await self.db.flush()
        return user

    async def grant(self, user: AppUser, nursery: Nursery) -> None:
        self.db.add(NurseryAccess(user_id=user.id, nursery_id=nursery.id, enterprise_id=nursery.enterprise_id))
        await self.db.flush()


@pytest.fixture
def data(db: AsyncSession) -> Data:
    return Data(db)
