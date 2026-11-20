"""Monde de test des crèches (tests/nurseries/conftest.py), complété par un dépôt « À traiter » en mémoire."""

from datetime import UTC, datetime, timedelta

import pytest

from app.main import app
from app.todo.service import get_todo_repository
from tests.nurseries.conftest import World, as_user, world  # noqa: F401 (fixtures partagées)
from tests.todo.fakes import InMemoryToDoRepository


@pytest.fixture
def todo(world: World, as_user) -> InMemoryToDoRepository:  # noqa: F811
    repo = InMemoryToDoRepository()
    # Valeur posée par la base (server_default) : à fixer ici, sans base.
    for rank, nursery in enumerate(world.nurseries.values()):
        nursery.created_at = datetime(2026, 9, 1, 8, 0, tzinfo=UTC) + timedelta(days=rank)

    async def override():
        return repo

    # as_user est demandé d'abord : son nettoyage (dependency_overrides.clear) retire aussi celui-ci.
    app.dependency_overrides[get_todo_repository] = override
    return repo
