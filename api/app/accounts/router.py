"""Routes des comptes.

- Direction : créer et inviter un employé, renvoyer une invitation, désactiver ou réactiver
  un employé (`/api/v2/staff…`, rôle `owner`, entreprise de la direction seulement).
- Employé invité, sans session : lire puis accepter l'invitation (`/api/v2/staff-invitations/…`).
- Tout compte connecté : changer son mot de passe (`/api/v2/auth/me/password`).
"""

import uuid

from fastapi import APIRouter, HTTPException, Response, status

from app.accounts import service
from app.accounts.schemas import (
    AcceptedOut,
    AcceptIn,
    EmployeeCreate,
    EmployeeUpdate,
    PasswordChangedOut,
    PasswordChangeIn,
    StaffInvitationInfo,
    StaffInvitationOut,
    TokenIn,
)
from app.auth.dependencies import ClientDep, CurrentUser, CurrentWebSession, NowDep
from app.auth.router import no_store
from app.db import SessionDep
from app.nurseries.dependencies import OwnerUser
from app.nurseries.schemas import StaffOut

router = APIRouter(prefix="/api/v2", tags=["personnel"])

_REFUSALS = {
    "email_taken": (status.HTTP_409_CONFLICT, "Cette adresse est déjà utilisée par un compte"),
    "not_found": (status.HTTP_404_NOT_FOUND, "Employé introuvable"),
    "already_active": (status.HTTP_409_CONFLICT, "Ce compte a déjà son mot de passe, ou il est désactivé"),
    "invalid": (status.HTTP_404_NOT_FOUND, "Invitation inconnue, expirée ou déjà utilisée"),
    "wrong_password": (status.HTTP_403_FORBIDDEN, "Mot de passe actuel incorrect"),
    "too_many_attempts": (status.HTTP_429_TOO_MANY_REQUESTS, "Trop de tentatives, réessayez plus tard"),
}


def _refused(refusal: service.AccountRefused) -> HTTPException:
    if refusal.reason == "weak_password":
        return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, refusal.detail)
    code, message = _REFUSALS[refusal.reason]
    return HTTPException(code, message)


def _invitation_out(employee, invitation, token: str) -> StaffInvitationOut:
    return StaffInvitationOut(employee=StaffOut.model_validate(employee), token=token,
                              expires_at=invitation.expires_at)


# --- Direction ---------------------------------------------------------------------

@router.post("/staff", status_code=status.HTTP_201_CREATED)
async def invite_employee(body: EmployeeCreate, owner: OwnerUser, db: SessionDep, client: ClientDep, now: NowDep,
                          response: Response) -> StaffInvitationOut:
    """Crée le compte d'un employé de l'entreprise, sans mot de passe, et son lien d'invitation (7 jours).

    L'accès aux crèches se donne ensuite, même avant l'acceptation : `PUT /nurseries/{id}/staff/{user_id}`.
    """
    no_store(response)
    try:
        employee, invitation, token = await service.invite_employee(db, owner, body.email, body.first_name,
                                                                    body.last_name, client, now)
    except service.AccountRefused as refusal:
        raise _refused(refusal) from None
    return _invitation_out(employee, invitation, token)


@router.post("/staff/{user_id}/invitation", status_code=status.HTTP_201_CREATED)
async def reinvite_employee(user_id: uuid.UUID, owner: OwnerUser, db: SessionDep, client: ClientDep, now: NowDep,
                            response: Response) -> StaffInvitationOut:
    """Nouveau lien pour un employé qui n'a pas encore choisi son mot de passe ; le précédent est annulé."""
    no_store(response)
    try:
        employee, invitation, token = await service.reinvite(db, owner, user_id, client, now)
    except service.AccountRefused as refusal:
        raise _refused(refusal) from None
    return _invitation_out(employee, invitation, token)


@router.patch("/staff/{user_id}")
async def update_employee(user_id: uuid.UUID, body: EmployeeUpdate, owner: OwnerUser, db: SessionDep,
                          client: ClientDep, now: NowDep) -> StaffOut:
    """Corriger le nom, ou désactiver le compte (départ) : ses sessions web et de tablette tombent aussitôt."""
    changes = body.model_dump(exclude_unset=True)
    for field in ("first_name", "last_name", "is_active"):
        if field in changes and changes[field] is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Le champ {field} ne peut pas être vide")
    try:
        employee = await service.employee_of(db, owner, user_id)
        for field in ("first_name", "last_name"):
            if field in changes:
                setattr(employee, field, changes[field])
        if "is_active" in changes:
            employee = await service.set_active(db, owner, user_id, changes["is_active"], client, now)
        # Sans effet si set_active a déjà validé ; nécessaire pour un simple changement de nom.
        await db.commit()
    except service.AccountRefused as refusal:
        raise _refused(refusal) from None
    return StaffOut.model_validate(employee)


# --- Employé invité ------------------------------------------------------------------

@router.post("/staff-invitations/lookup")
async def lookup_invitation(body: TokenIn, db: SessionDep, now: NowDep) -> StaffInvitationInfo:
    """Ce que l'employé voit en ouvrant son lien : prénom, entreprise, adresse de connexion."""
    try:
        found = await service.pending(db, body.token, now)
    except service.AccountRefused as refusal:
        raise _refused(refusal) from None
    return StaffInvitationInfo(first_name=found.user.first_name, enterprise_name=found.enterprise.name,
                               email=found.user.email)


@router.post("/staff-invitations/accept")
async def accept_invitation(body: AcceptIn, db: SessionDep, client: ClientDep, now: NowDep) -> AcceptedOut:
    """L'employé choisit son mot de passe (politique de LUN-41) ; il se connecte ensuite normalement."""
    try:
        user = await service.accept(db, body.token, body.password, client, now)
    except service.AccountRefused as refusal:
        raise _refused(refusal) from None
    return AcceptedOut(email=user.email)


# --- Mot de passe ----------------------------------------------------------------------

@router.put("/auth/me/password", tags=["authentification"])
async def change_password(body: PasswordChangeIn, user: CurrentUser, web: CurrentWebSession, db: SessionDep,
                          client: ClientDep, now: NowDep) -> PasswordChangedOut:
    """Change son mot de passe (l'actuel est exigé) ; les autres sessions du compte, tablette comprise, sont fermées."""
    try:
        closed = await service.change_password(db, user, web.session, body.current_password, body.new_password,
                                               client, now)
    except service.AccountRefused as refusal:
        raise _refused(refusal) from None
    return PasswordChangedOut(other_sessions_closed=closed)
