"""Point d'entrée de l'API Luniqo v2.

Toutes les routes sont sous /api : la passerelle nginx relaie /api/ tel quel.
La documentation est générée par FastAPI et complétée par app/openapi.py :
schéma OpenAPI sur /api/openapi.json, Swagger UI sur /api/docs et ReDoc sur
/api/redoc (ces deux-là désactivables par API_DOCS=false).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app import __version__, openapi
from app.accounts.router import router as accounts_router
from app.attendance.router import router as attendance_router
from app.auth.router import router as auth_router
from app.children.router import router as children_router
from app.cleaning.router import router as cleaning_router
from app.config import Settings, get_settings
from app.db import SessionDep, get_engine
from app.family.router import router as family_router
from app.mfa.router import router as mfa_router
from app.nurseries.router import router as nurseries_router
from app.passkeys.router import router as passkeys_router
from app.schemas import Health
from app.security import OriginCheckMiddleware
from app.tablets.router import router as tablets_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    # Arrêt (SIGTERM) : les connexions du pool sont fermées proprement plutôt
    # que coupées par la fin du processus.
    await get_engine().dispose()


async def health(session: SessionDep, response: Response) -> Health:
    """État de l'API et de sa connexion à la base. Utilisé par le healthcheck Docker."""
    try:
        await session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return Health(status="degraded", database="unreachable", version=__version__)
    return Health(status="ok", database="ok", version=__version__)


def create_app(settings: Settings) -> FastAPI:
    application = FastAPI(
        lifespan=lifespan,
        title="Luniqo API",
        version=__version__,
        description=openapi.DESCRIPTION,
        openapi_tags=openapi.TAGS,
        docs_url="/api/docs" if settings.docs_enabled else None,
        redoc_url="/api/redoc" if settings.docs_enabled else None,
        openapi_url="/api/openapi.json",
        swagger_ui_parameters={"defaultModelsExpandDepth": 0, "displayRequestDuration": True},
    )
    application.add_middleware(OriginCheckMiddleware)
    for router in (auth_router, mfa_router, passkeys_router, nurseries_router, tablets_router, children_router,
                   attendance_router, family_router, cleaning_router, accounts_router):
        application.include_router(router)
    application.add_api_route(
        "/api/health", health, methods=["GET"], tags=["supervision"],
        responses={status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": Health, "description": "Base injoignable",
            "content": {"application/json": {"examples": {"Base injoignable": {"value": {
                "status": "degraded", "database": "unreachable", "version": __version__}}}}}}},
    )
    openapi.install(application)
    return application


app = create_app(get_settings())
