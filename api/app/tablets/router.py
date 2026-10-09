"""Routes des tablettes et du PIN."""

import uuid

from fastapi import APIRouter, HTTPException, Response, status

from app.auth.dependencies import ClientDep, CurrentUser, NowDep
from app.auth.models import UserRole
from app.config import get_settings
from app.db import SessionDep
from app.nurseries.dependencies import ManagedNursery, OwnerUser
from app.tablets import policy, service
from app.tablets.dependencies import CurrentActor, CurrentTablet, action_cookie_name, device_cookie_name
from app.tablets.schemas import (
    PinIn,
    TabletActorOut,
    TabletCreate,
    TabletInfo,
    TabletLoginIn,
    TabletOut,
    TabletStaffMember,
    display_name,
)

router = APIRouter(prefix="/api/v2", tags=["tablettes"])

_PIN_ERRORS = {
    "invalid": (status.HTTP_401_UNAUTHORIZED, "PIN incorrect"),
    "locked": (status.HTTP_423_LOCKED, "PIN bloqué après 3 erreurs : demandez à la direction de le débloquer"),
    "not_set": (status.HTTP_409_CONFLICT, "PIN non défini : le choisir depuis l'espace employé"),
    "throttled": (status.HTTP_429_TOO_MANY_REQUESTS, "Trop d'erreurs de PIN sur cette tablette, réessayez plus tard"),
}


def _set_cookie(response: Response, name: str, value: str, max_age: int) -> None:
    # SameSite=Strict : ces cookies ne servent qu'à la tablette, sur l'origine de Luniqo.
    response.set_cookie(name, value, max_age=max_age, httponly=True, secure=get_settings().cookie_secure,
                        samesite="strict", path="/")


def _delete_cookie(response: Response, name: str) -> None:
    response.delete_cookie(name, httponly=True, secure=get_settings().cookie_secure, samesite="strict", path="/")


# --- Direction : enrôlement et révocation -------------------------------------

@router.post("/nurseries/{nursery_id}/tablets", status_code=status.HTTP_201_CREATED)
async def enroll_tablet(body: TabletCreate, context: ManagedNursery, db: SessionDep, client: ClientDep,
                        now: NowDep, response: Response) -> TabletOut:
    """Enrôle **l'appareil qui envoie la requête** comme tablette de cette crèche.

    La direction se connecte sur la tablette elle-même, l'enrôle, puis se
    déconnecte : le cookie d'appareil (90 jours) reste sur la tablette.
    """
    device, token = await service.enroll(db, context.nursery, context.user, body.label, client, now)
    _set_cookie(response, device_cookie_name(), token, int(policy.DEVICE_LIFETIME.total_seconds()))
    return TabletOut.model_validate(device)


@router.get("/nurseries/{nursery_id}/tablets")
async def list_tablets(context: ManagedNursery, db: SessionDep) -> list[TabletOut]:
    return [TabletOut.model_validate(device) for device in await service.list_devices(db, context.nursery.id)]


@router.delete("/nurseries/{nursery_id}/tablets/{tablet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_tablet(tablet_id: uuid.UUID, context: ManagedNursery, db: SessionDep, client: ClientDep,
                        now: NowDep) -> None:
    """Révoque la tablette (perte, vol, remplacement) et ferme ses sessions d'action. Effet immédiat."""
    if not await service.revoke(db, context.nursery, tablet_id, context.user, client, now):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tablette introuvable")


# --- PIN : employé et direction -----------------------------------------------

@router.put("/auth/me/pin", status_code=status.HTTP_204_NO_CONTENT, tags=["authentification"])
async def set_my_pin(body: PinIn, user: CurrentUser, db: SessionDep, client: ClientDep, now: NowDep) -> None:
    """L'employé choisit ou change son PIN de tablette, en confirmant son mot de passe. Débloque le PIN."""
    if user.role != UserRole.EMPLOYEE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Le PIN de tablette est réservé aux employés")
    try:
        await service.set_pin(db, user, body.password, body.pin, client, now)
    except service.TooManyAttempts:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de tentatives, réessayez plus tard") from None
    except service.WrongPassword:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Mot de passe incorrect") from None
    except policy.PinPolicyError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from None


@router.post("/staff/{user_id}/pin/unlock", status_code=status.HTTP_204_NO_CONTENT, tags=["personnel"])
async def unlock_pin(user_id: uuid.UUID, owner: OwnerUser, db: SessionDep, client: ClientDep, now: NowDep) -> None:
    """La direction débloque le PIN d'un employé de son entreprise."""
    if not await service.unlock_pin(db, owner, user_id, client, now):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employé introuvable")


# --- Tablette ------------------------------------------------------------------

@router.get("/tablet")
async def tablet_info(tablet: CurrentTablet, db: SessionDep) -> TabletInfo:
    """Crèche de la tablette et employés qui peuvent s'y identifier (prénom et initiale)."""
    members = await service.staff(db, tablet)
    return TabletInfo(tablet_id=tablet.device.id, label=tablet.device.label, nursery_id=tablet.nursery.id,
                      nursery_name=tablet.nursery.name, staff=[TabletStaffMember.of(user) for user in members])


@router.post("/tablet/session", status_code=status.HTTP_201_CREATED)
async def open_tablet_session(body: TabletLoginIn, tablet: CurrentTablet, db: SessionDep, client: ClientDep,
                              now: NowDep, response: Response) -> TabletActorOut:
    """Ouvre une session d'action de 2 minutes par PIN, pour la crèche de la tablette."""
    try:
        user, token = await service.open_action_session(db, tablet, body.user_id, body.pin, client, now)
    except service.PinRefused as refused:
        code, message = _PIN_ERRORS[refused.reason]
        raise HTTPException(code, message) from None
    _set_cookie(response, action_cookie_name(), token, int(policy.ACTION_SESSION_LIFETIME.total_seconds()))
    return TabletActorOut(user_id=user.id, display_name=display_name(user), nursery_id=tablet.nursery.id,
                          nursery_name=tablet.nursery.name, expires_at=now + policy.ACTION_SESSION_LIFETIME)


@router.get("/tablet/session")
async def tablet_session(actor: CurrentActor) -> TabletActorOut:
    """Employé de la session d'action en cours."""
    return TabletActorOut(user_id=actor.user.id, display_name=display_name(actor.user),
                          nursery_id=actor.tablet.nursery.id, nursery_name=actor.tablet.nursery.name,
                          expires_at=actor.session.created_at + policy.ACTION_SESSION_LIFETIME)


@router.delete("/tablet/session", status_code=status.HTTP_204_NO_CONTENT)
async def end_tablet_session(actor: CurrentActor, db: SessionDep, client: ClientDep, now: NowDep,
                             response: Response) -> None:
    """Ferme la session d'action (l'employé a fini son geste)."""
    await service.end_action_session(db, actor, client, now)
    _delete_cookie(response, action_cookie_name())
