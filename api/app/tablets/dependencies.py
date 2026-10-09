"""Dépendances des routes de tablette.

`CurrentTablet` : la requête vient d'une tablette enrôlée, valide, dont la crèche est ouverte.
`CurrentActor` : en plus, un employé y a ouvert une session d'action par PIN il y a moins de 2 minutes.
Les futures routes de terrain (pointage, ménage, HACCP) déclareront `CurrentActor`.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from app.auth.dependencies import NowDep
from app.config import get_settings
from app.db import SessionDep
from app.tablets import service
from app.tablets.service import TabletActor, TabletContext


def device_cookie_name() -> str:
    return "__Host-luniqo_device" if get_settings().cookie_secure else "luniqo_device"


def action_cookie_name() -> str:
    return "__Host-luniqo_tablet" if get_settings().cookie_secure else "luniqo_tablet"


async def current_tablet(request: Request, db: SessionDep, now: NowDep) -> TabletContext:
    token = request.cookies.get(device_cookie_name())
    tablet = await service.tablet_from_token(db, token, now) if token else None
    if tablet is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Tablette non enrôlée, expirée ou révoquée")
    return tablet


CurrentTablet = Annotated[TabletContext, Depends(current_tablet)]


async def current_actor(request: Request, tablet: CurrentTablet, db: SessionDep, now: NowDep) -> TabletActor:
    token = request.cookies.get(action_cookie_name())
    actor = await service.actor_from_token(db, tablet, token, now) if token else None
    if actor is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session de tablette absente ou expirée : saisir le PIN")
    return actor


CurrentActor = Annotated[TabletActor, Depends(current_actor)]
