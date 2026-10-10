"""Point d'entrée de l'API Luniqo v2.

Toutes les routes sont sous /api : la passerelle nginx relaie /api/ tel quel.
La documentation est générée par FastAPI : Swagger UI sur /api/docs, ReDoc
sur /api/redoc, schéma OpenAPI sur /api/openapi.json.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app import __version__
from app.accounts.router import router as accounts_router
from app.attendance.router import router as attendance_router
from app.auth.router import router as auth_router
from app.children.router import router as children_router
from app.cleaning.router import router as cleaning_router
from app.db import SessionDep, get_engine
from app.family.router import router as family_router
from app.mfa.router import router as mfa_router
from app.nurseries.router import router as nurseries_router
from app.schemas import Health
from app.security import OriginCheckMiddleware
from app.tablets.router import router as tablets_router


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
app.add_middleware(OriginCheckMiddleware)
app.include_router(auth_router)
app.include_router(mfa_router)
app.include_router(nurseries_router)
app.include_router(tablets_router)
app.include_router(children_router)
app.include_router(attendance_router)
app.include_router(family_router)
app.include_router(cleaning_router)
app.include_router(accounts_router)


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
