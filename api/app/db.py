"""Connexion à PostgreSQL : un pool asynchrone par processus, une session par requête.

Les routes sont asynchrones : une requête qui attend la base ne bloque aucun
thread. Le nombre de requêtes servies en même temps est borné par le pool
(DB_POOL_SIZE) ; les suivantes attendent une connexion libre sans créer de
thread, ce qui reste compatible avec la limite « pids » du conteneur.
"""

from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from app.config import get_settings


@lru_cache
def get_engine() -> AsyncEngine:
    settings = get_settings()
    # Chaque worker a son propre pool : le nombre total de connexions vaut
    # API_WORKERS × DB_POOL_SIZE et doit rester sous max_connections de la base.
    return create_async_engine(
        settings.database_url,
        pool_size=settings.db_pool_size,
        max_overflow=0,
        pool_pre_ping=True,
        # Base injoignable : échec au bout de 2 s plutôt qu'une attente sans
        # fin. /api/health répond alors 503 dans le délai du healthcheck (3 s).
        connect_args={"connect_timeout": 2},
    )


async def get_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSession(get_engine()) as session:
        yield session
