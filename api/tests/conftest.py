"""Tests unitaires de la couche HTTP : la base est remplacée par une session factice."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.db import get_session
from app.main import app


class FakeSession:
    """Imite les méthodes d'AsyncSession utilisées par les routes."""

    def __init__(self, rows=(), fail=False):
        self.rows = list(rows)
        self.fail = fail

    async def execute(self, statement):
        if self.fail:
            from sqlalchemy.exc import OperationalError

            raise OperationalError(str(statement), {}, Exception("connexion refusée"))

    async def scalars(self, statement):
        return iter(self.rows)


@pytest.fixture
def client_with() -> Iterator:
    """Fabrique un client HTTP dont la session de base est `FakeSession(**kwargs)`."""

    def make(**kwargs) -> TestClient:
        session = FakeSession(**kwargs)

        async def override():
            return session

        app.dependency_overrides[get_session] = override
        return TestClient(app)

    yield make
    app.dependency_overrides.clear()
