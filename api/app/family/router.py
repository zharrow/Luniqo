"""Routes des comptes familles.

- Direction : inviter un responsable (`/api/v2/nurseries/{id}/guardians/{guardian_id}/invitation`).
- Parent sans compte : consulter puis accepter l'invitation (`/api/v2/invitations/…`).
- Parent connecté (rôle `guardian`) : ses enfants et leurs présences (`/api/v2/family/…`).
"""

import uuid
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.attendance import policy as attendance_policy
from app.auth.dependencies import ClientDep, NowDep
from app.children.models import Child, Guardian
from app.db import SessionDep
from app.family import service
from app.family.schemas import (
    AcceptedOut,
    AcceptIn,
    FamilyChild,
    FamilyChildDetail,
    FamilyContact,
    InvitationInfo,
    InvitationOut,
    PresenceOut,
    TokenIn,
)
from app.nurseries.dependencies import GuardianUser, ManagedNursery

router = APIRouter(prefix="/api/v2", tags=["familles"])

_REFUSALS = {
    "no_email": (status.HTTP_422_UNPROCESSABLE_CONTENT, "Ce responsable n'a pas d'adresse e-mail"),
    "invalid": (status.HTTP_404_NOT_FOUND, "Invitation inconnue, expirée ou déjà utilisée"),
    "email_taken": (status.HTTP_409_CONFLICT, "Cette adresse est déjà utilisée par un compte qui n'est pas un compte "
                                              "famille : contactez la crèche"),
    "wrong_password": (status.HTTP_403_FORBIDDEN, "Un compte existe déjà avec cette adresse : saisir son mot de passe"),
}

MAX_HISTORY_DAYS = 62


def _refused(refusal: service.InvitationRefused) -> HTTPException:
    if refusal.reason == "weak_password":
        return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, refusal.detail)
    code, message = _REFUSALS[refusal.reason]
    return HTTPException(code, message)


def _short(guardian: Guardian | None) -> str | None:
    if guardian is None:
        return None
    return f"{guardian.first_name} {guardian.last_name[:1]}." if guardian.last_name else guardian.first_name


# --- Direction -------------------------------------------------------------------

@router.post("/nurseries/{nursery_id}/guardians/{guardian_id}/invitation", status_code=status.HTTP_201_CREATED,
             tags=["enfants et familles"])
async def invite_guardian(guardian_id: uuid.UUID, context: ManagedNursery, db: SessionDep, client: ClientDep,
                          now: NowDep) -> InvitationOut:
    """Crée un lien d'invitation (7 jours, usage unique) ; annule les invitations précédentes de ce responsable."""
    guardian = await db.scalar(select(Guardian).where(Guardian.id == guardian_id,
                                                      Guardian.nursery_id == context.nursery.id, Guardian.is_active))
    if guardian is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Responsable introuvable")
    try:
        invitation, token = await service.invite(db, guardian, context.user, client, now)
    except service.InvitationRefused as refusal:
        raise _refused(refusal) from None
    return InvitationOut(token=token, email=invitation.email, expires_at=invitation.expires_at)


# --- Parent sans compte ------------------------------------------------------

@router.post("/invitations/lookup")
async def lookup_invitation(body: TokenIn, db: SessionDep, now: NowDep) -> InvitationInfo:
    """Ce que le parent voit en ouvrant son lien : prénom, crèche, adresse du futur compte."""
    try:
        found = await service.pending(db, body.token, now)
    except service.InvitationRefused as refusal:
        raise _refused(refusal) from None
    return InvitationInfo(first_name=found.guardian.first_name, nursery_name=found.nursery.name,
                          email=found.invitation.email,
                          account_exists=await service.account_for(db, found.invitation.email) is not None)


@router.post("/invitations/accept", status_code=status.HTTP_201_CREATED)
async def accept_invitation(body: AcceptIn, db: SessionDep, client: ClientDep, now: NowDep) -> AcceptedOut:
    """Crée le compte famille (mot de passe choisi) ou relie un compte famille existant (son mot de passe)."""
    existed = None
    try:
        found = await service.pending(db, body.token, now)
        existed = await service.account_for(db, found.invitation.email) is not None
        user = await service.accept(db, body.token, body.password, client, now)
    except service.InvitationRefused as refusal:
        raise _refused(refusal) from None
    return AcceptedOut(email=user.email, account_created=not existed)


# --- Parent connecté -----------------------------------------------------------

async def _today(db: SessionDep, child: Child, now: datetime) -> tuple[str, datetime | None, datetime | None]:
    day = attendance_policy.local_day(now)
    presences = await service.attendance_between(db, child, day, day)
    if not presences:
        return "absent", None, None
    latest = presences[0]
    return ("present" if latest.departed_at is None else "left"), latest.arrived_at, latest.departed_at


@router.get("/family/children")
async def my_children(user: GuardianUser, db: SessionDep, now: NowDep) -> list[FamilyChild]:
    """Enfants dont je suis responsable avec autorité parentale, et leur présence du jour."""
    result = []
    for child, nursery in await service.children_of(db, user):
        today, arrived, departed = await _today(db, child, now)
        result.append(FamilyChild(id=child.id, first_name=child.first_name, last_name=child.last_name,
                                  nursery_name=nursery.name, status=child.status, today=today,
                                  today_arrived_at=arrived, today_departed_at=departed))
    return result


@router.get("/family/children/{child_id}", responses={status.HTTP_404_NOT_FOUND: {"description": "Hors de ma famille"}})
async def my_child(child_id: uuid.UUID, user: GuardianUser, db: SessionDep, now: NowDep,
                   days: Annotated[int, Query(ge=1, le=MAX_HISTORY_DAYS)] = 30) -> FamilyChildDetail:
    """Fiche de mon enfant : responsables (sans coordonnées) et présences des `days` derniers jours."""
    found = await service.child_of(db, user, child_id)
    if found is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enfant introuvable")
    child, nursery = found
    today, arrived, departed = await _today(db, child, now)
    end = attendance_policy.local_day(now)
    presences = await service.attendance_between(db, child, end - timedelta(days=days - 1), end)
    pickers = await service.guardian_names(db, {p.picked_up_by for p in presences if p.picked_up_by})
    return FamilyChildDetail(
        id=child.id, first_name=child.first_name, last_name=child.last_name, nursery_name=nursery.name,
        status=child.status, today=today, today_arrived_at=arrived, today_departed_at=departed,
        birth_date=child.birth_date,
        contacts=[FamilyContact(display_name=_short(guardian), relationship=link.relationship,
                                has_parental_authority=link.has_parental_authority,
                                is_authorized_pickup=link.is_authorized_pickup)
                  for link, guardian in await service.contacts(db, child)],
        presences=[PresenceOut(day=p.day, arrived_at=p.arrived_at, departed_at=p.departed_at,
                               picked_up_by=_short(pickers.get(p.picked_up_by))) for p in presences])
