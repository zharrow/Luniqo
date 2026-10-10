"""Comptes du personnel et mot de passe. Routes testées sur PostgreSQL (tests/integration/)."""

import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.accounts import policy
from app.accounts.models import StaffInvitation
from app.auth import passwords
from app.auth.models import AppUser, AuthEvent, AuthEventType, UserRole, UserSession
from app.auth.policy import FAILURE_WINDOW
from app.auth.service import Client, normalize_email
from app.auth.tokens import new_token, token_digest
from app.nurseries.models import Enterprise


class AccountRefused(Exception):
    """`reason` : email_taken, not_found, already_active, invalid, wrong_password, too_many_attempts,
    weak_password (avec `detail`)."""

    def __init__(self, reason: str, detail: str | None = None) -> None:
        super().__init__(reason)
        self.reason = reason
        self.detail = detail


@dataclass(frozen=True)
class PendingInvitation:
    invitation: StaffInvitation
    user: AppUser
    enterprise: Enterprise


def _event(db: AsyncSession, kind: AuthEventType, client: Client, now: datetime, *, user_id: uuid.UUID | None,
           email: str | None = None, detail: str | None = None) -> None:
    db.add(AuthEvent(occurred_at=now, event=kind.value, user_id=user_id, email=email, ip=client.ip,
                     user_agent=client.user_agent, detail=detail))


async def _revoke_invitations(db: AsyncSession, user_id: uuid.UUID, now: datetime) -> None:
    await db.execute(update(StaffInvitation).where(
        StaffInvitation.user_id == user_id, StaffInvitation.used_at.is_(None),
        StaffInvitation.revoked_at.is_(None)).values(revoked_at=now))


async def _new_invitation(db: AsyncSession, employee: AppUser, owner: AppUser, client: Client,
                          now: datetime) -> tuple[StaffInvitation, str]:
    await _revoke_invitations(db, employee.id, now)
    token = new_token()
    invitation = StaffInvitation(id=uuid.uuid4(), token_digest=token_digest(token), user_id=employee.id,
                                 created_by=owner.id, created_at=now, expires_at=now + policy.INVITATION_LIFETIME)
    db.add(invitation)
    _event(db, AuthEventType.INVITATION_CREATED, client, now, user_id=owner.id, email=employee.email,
           detail=f"employee:{employee.id}")
    return invitation, token


# --- Direction -------------------------------------------------------------------

async def employee_of(db: AsyncSession, owner: AppUser, user_id: uuid.UUID) -> AppUser:
    employee = await db.scalar(select(AppUser).where(AppUser.id == user_id, AppUser.role == UserRole.EMPLOYEE,
                                                     AppUser.enterprise_id == owner.enterprise_id))
    if employee is None:
        raise AccountRefused("not_found")
    return employee


async def invite_employee(db: AsyncSession, owner: AppUser, email: str, first_name: str, last_name: str,
                          client: Client, now: datetime) -> tuple[AppUser, StaffInvitation, str]:
    """Crée le compte de l'employé, sans mot de passe, dans l'entreprise de la direction, et son invitation."""
    email = normalize_email(email)
    if await db.scalar(select(AppUser.id).where(AppUser.email == email)):
        raise AccountRefused("email_taken")
    employee = AppUser(id=uuid.uuid4(), email=email, password_hash=None, first_name=first_name,
                       last_name=last_name, role=UserRole.EMPLOYEE, enterprise_id=owner.enterprise_id,
                       is_active=True, created_at=now)
    db.add(employee)
    await db.flush()
    invitation, token = await _new_invitation(db, employee, owner, client, now)
    try:
        await db.commit()
    except IntegrityError:
        # Même adresse créée au même instant par une autre requête : l'unicité de la base tranche.
        await db.rollback()
        raise AccountRefused("email_taken") from None
    return employee, invitation, token


async def reinvite(db: AsyncSession, owner: AppUser, user_id: uuid.UUID, client: Client,
                   now: datetime) -> tuple[AppUser, StaffInvitation, str]:
    """Nouveau lien (le précédent est annulé), tant que l'employé n'a pas choisi son mot de passe."""
    employee = await employee_of(db, owner, user_id)
    if employee.has_password or not employee.is_active:
        raise AccountRefused("already_active")
    invitation, token = await _new_invitation(db, employee, owner, client, now)
    await db.commit()
    return employee, invitation, token


async def set_active(db: AsyncSession, owner: AppUser, user_id: uuid.UUID, active: bool, client: Client,
                     now: datetime) -> AppUser:
    """Départ d'un salarié : toutes ses sessions (web et tablette) et ses invitations sont fermées sur-le-champ.

    Ses accès aux crèches sont gardés, inopérants tant que le compte est désactivé :
    une réactivation (retour de congé) les retrouve.
    """
    employee = await employee_of(db, owner, user_id)
    if employee.is_active == active:
        return employee
    employee.is_active = active
    if active:
        _event(db, AuthEventType.ACCOUNT_REACTIVATED, client, now, user_id=employee.id, detail=f"by:{owner.id}")
    else:
        await db.execute(delete(UserSession).where(UserSession.user_id == employee.id))
        await _revoke_invitations(db, employee.id, now)
        _event(db, AuthEventType.ACCOUNT_DEACTIVATED, client, now, user_id=employee.id, detail=f"by:{owner.id}")
        _event(db, AuthEventType.SESSIONS_REVOKED, client, now, user_id=employee.id, detail="deactivated")
    await db.commit()
    return employee


# --- Employé invité (sans session) -------------------------------------------------

async def pending(db: AsyncSession, token: str, now: datetime) -> PendingInvitation:
    row = (await db.execute(
        select(StaffInvitation, AppUser, Enterprise)
        .join(AppUser, AppUser.id == StaffInvitation.user_id)
        .join(Enterprise, Enterprise.id == AppUser.enterprise_id)
        .where(StaffInvitation.token_digest == token_digest(token)))).first()
    if row is None:
        raise AccountRefused("invalid")
    invitation, user, enterprise = row
    if not policy.invitation_usable(used_at=invitation.used_at, revoked_at=invitation.revoked_at,
                                    expires_at=invitation.expires_at, now=now, account_active=user.is_active,
                                    has_password=user.has_password):
        raise AccountRefused("invalid")
    return PendingInvitation(invitation, user, enterprise)


async def accept(db: AsyncSession, token: str, password: str, client: Client, now: datetime) -> AppUser:
    found = await pending(db, token, now)
    user = found.user
    try:
        passwords.check_policy(password, user.email)
    except passwords.PasswordPolicyError as error:
        raise AccountRefused("weak_password", str(error)) from None
    user.password_hash = await passwords.hash_password(password)
    user.password_changed_at = now
    found.invitation.used_at = now
    _event(db, AuthEventType.INVITATION_ACCEPTED, client, now, user_id=user.id, email=user.email,
           detail=f"employee:{user.id}")
    await db.commit()
    return user


# --- Changement de mot de passe (tout compte connecté) ------------------------------

async def change_password(db: AsyncSession, user: AppUser, current_session: UserSession, current: str, new: str,
                          client: Client, now: datetime) -> int:
    """Remplace le mot de passe et ferme toutes les **autres** sessions du compte (ADR-003). Renvoie leur nombre."""
    failures = await db.scalar(select(func.count()).select_from(AuthEvent).where(
        AuthEvent.user_id == user.id, AuthEvent.event == AuthEventType.PASSWORD_CHANGE_FAILED.value,
        AuthEvent.occurred_at >= now - FAILURE_WINDOW))
    if failures >= policy.PASSWORD_CHANGE_MAX_FAILURES:
        raise AccountRefused("too_many_attempts")
    valid, _ = await passwords.verify_password(user.password_hash, current)
    if not valid:
        _event(db, AuthEventType.PASSWORD_CHANGE_FAILED, client, now, user_id=user.id, detail="bad_password")
        await db.commit()
        raise AccountRefused("wrong_password")
    try:
        passwords.check_policy(new, user.email)
    except passwords.PasswordPolicyError as error:
        raise AccountRefused("weak_password", str(error)) from None
    user.password_hash = await passwords.hash_password(new)
    user.password_changed_at = now
    # Un mot de passe peut changer parce qu'il a fuité : les sessions ouvertes ailleurs, tablette comprise, tombent.
    result = await db.execute(delete(UserSession).where(UserSession.user_id == user.id,
                                                        UserSession.id != current_session.id))
    _event(db, AuthEventType.PASSWORD_CHANGED, client, now, user_id=user.id)
    _event(db, AuthEventType.SESSIONS_REVOKED, client, now, user_id=user.id, detail="password_changed")
    await db.commit()
    return result.rowcount
