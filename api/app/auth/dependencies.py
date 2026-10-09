"""Dépendances FastAPI : dépôt, horloge, client et utilisateur connecté.

`CurrentUser` est le point unique de vérification de session : une route qui
le déclare n'est jamais exécutée sans session valable, ni avant que le second
facteur exigé ait été présenté (ADR-004). Seules /me, la déconnexion et les
routes du second facteur déclarent `CurrentWebSession`, qui accepte une
session en attente du second facteur.

Toutes les dépendances sont `async def`, même sans attente : FastAPI exécute
une dépendance `def` dans un thread, et sous charge ces threads dépassaient la
limite de processus du conteneur (15 threads mesurés pour 20 connexions
simultanées le 2026-10-08, contre 1 attendu).
"""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from app.auth.models import AppUser
from app.auth.repository import AuthRepository, SqlAuthRepository
from app.auth.service import Client, WebSession, authenticate
from app.config import get_settings
from app.db import SessionDep


def cookie_name() -> str:
    # Le préfixe __Host- impose Secure, Path=/ et l'absence de Domain : le
    # navigateur refuse qu'un sous-domaine pose ou écrase ce cookie.
    return "__Host-luniqo_session" if get_settings().cookie_secure else "luniqo_session"


async def get_repository(session: SessionDep) -> AuthRepository:
    return SqlAuthRepository(session)


async def get_now() -> datetime:
    return datetime.now(UTC)


async def get_client(request: Request) -> Client:
    # Adresse transmise par la passerelle (X-Forwarded-For, lu par uvicorn
    # avec --proxy-headers) : c'est celle du navigateur, pas celle de nginx.
    return Client(ip=request.client.host if request.client else None,
                  user_agent=request.headers.get("user-agent"))


RepositoryDep = Annotated[AuthRepository, Depends(get_repository)]
NowDep = Annotated[datetime, Depends(get_now)]
ClientDep = Annotated[Client, Depends(get_client)]


async def current_web_session(request: Request, repo: RepositoryDep, client: ClientDep,
                              now: NowDep) -> WebSession:
    token = request.cookies.get(cookie_name())
    web = await authenticate(repo, token, client, now) if token else None
    if web is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentification requise")
    return web


CurrentWebSession = Annotated[WebSession, Depends(current_web_session)]


async def current_user(web: CurrentWebSession) -> AppUser:
    if web.session.mfa_pending:
        # 403 et non 401 : la session existe, il lui manque le second facteur.
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Second facteur requis")
    return web.user


CurrentUser = Annotated[AppUser, Depends(current_user)]
