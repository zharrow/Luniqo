"""Point d'entrée de l'API Luniqo v2.

Toutes les routes sont sous /api : la passerelle nginx relaie /api/ tel quel.
La documentation est générée par FastAPI : Swagger UI sur /api/docs, ReDoc
sur /api/redoc, schéma OpenAPI sur /api/openapi.json.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Response, status
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.db import get_engine, get_session
from app.models import Nursery
from app.schemas import Health, NurseryOut


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    # Arrêt (SIGTERM) : les connexions du pool sont fermées proprement plutôt
    # que coupées par la fin du processus.
    await get_engine().dispose()


app = FastAPI(
    lifespan=lifespan,
    title="Luniqo API",
    version=__version__,
    description="API de la v2 de Luniqo, logiciel de gestion de crèches.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@app.get(
    "/api/health",
    tags=["supervision"],
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": Health}},
)
async def health(session: SessionDep, response: Response) -> Health:
    """État de l'API et de sa connexion à la base. Utilisé par le healthcheck Docker."""
    try:
        await session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return Health(status="degraded", database="unreachable", version=__version__)
    return Health(status="ok", database="ok", version=__version__)


@app.get("/api/v2/nurseries", tags=["crèches"])
async def list_nurseries(session: SessionDep) -> list[NurseryOut]:
    """Crèches actives.

    Squelette sans authentification, sur données synthétiques : l'accès par
    utilisateur et par crèche arrive avec le socle v2 (ADR-003).
    """
    nurseries = await session.scalars(select(Nursery).where(Nursery.is_active).order_by(Nursery.name))
    return [NurseryOut.model_validate(nursery) for nursery in nurseries]
