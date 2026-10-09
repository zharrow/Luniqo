"""Invitations et consultation famille. Routes testées sur PostgreSQL (tests/integration/)."""

import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.attendance.models import Attendance
from app.auth import passwords
from app.auth.models import AppUser, AuthEvent, AuthEventType, UserRole
from app.auth.service import Client
from app.auth.tokens import new_token, token_digest
from app.children.models import Child, ChildGuardian, Guardian
from app.family.models import Invitation
from app.nurseries.models import Nursery

INVITATION_LIFETIME = timedelta(days=7)


class InvitationRefused(Exception):
    """`reason` : no_email, invalid, email_taken, wrong_password, weak_password (avec `detail`)."""

    def __init__(self, reason: str, detail: str | None = None) -> None:
        super().__init__(reason)
        self.reason = reason
        self.detail = detail


@dataclass(frozen=True)
class PendingInvitation:
    invitation: Invitation
    guardian: Guardian
    nursery: Nursery


def _event(db: AsyncSession, kind: AuthEventType, client: Client, now: datetime, *, user_id: uuid.UUID | None,
           email: str | None, detail: str | None = None) -> None:
    db.add(AuthEvent(occurred_at=now, event=kind.value, user_id=user_id, email=email, ip=client.ip,
                     user_agent=client.user_agent, detail=detail))


# --- Invitation (direction) ----------------------------------------------------

async def invite(db: AsyncSession, guardian: Guardian, owner: AppUser, client: Client,
                 now: datetime) -> tuple[Invitation, str]:
    if not guardian.email:
        raise InvitationRefused("no_email")
    # Une seule invitation valable à la fois par responsable.
    await db.execute(update(Invitation).where(Invitation.guardian_id == guardian.id, Invitation.used_at.is_(None),
                                              Invitation.revoked_at.is_(None)).values(revoked_at=now))
    token = new_token()
    invitation = Invitation(id=uuid.uuid4(), token_digest=token_digest(token), guardian_id=guardian.id,
                            email=guardian.email, created_by=owner.id, created_at=now,
                            expires_at=now + INVITATION_LIFETIME)
    db.add(invitation)
    _event(db, AuthEventType.INVITATION_CREATED, client, now, user_id=owner.id, email=guardian.email,
           detail=f"guardian:{guardian.id}")
    await db.commit()
    return invitation, token


# --- Acceptation (parent, sans session) -------------------------------------

async def pending(db: AsyncSession, token: str, now: datetime) -> PendingInvitation:
    row = (await db.execute(
        select(Invitation, Guardian, Nursery)
        .join(Guardian, Guardian.id == Invitation.guardian_id)
        .join(Nursery, Nursery.id == Guardian.nursery_id)
        .where(Invitation.token_digest == token_digest(token))
    )).first()
    if row is None:
        raise InvitationRefused("invalid")
    invitation, guardian, nursery = row
    if invitation.used_at or invitation.revoked_at or now >= invitation.expires_at or not guardian.is_active:
        raise InvitationRefused("invalid")
    return PendingInvitation(invitation, guardian, nursery)


async def account_for(db: AsyncSession, email: str) -> AppUser | None:
    return await db.scalar(select(AppUser).where(AppUser.email == email))


async def accept(db: AsyncSession, token: str, password: str, client: Client, now: datetime) -> AppUser:
    found = await pending(db, token, now)
    invitation, guardian = found.invitation, found.guardian
    user = await account_for(db, invitation.email)
    if user is not None:
        # Compte existant (enfants dans une autre crèche) : on le relie, après preuve du mot de passe.
        if user.role != UserRole.GUARDIAN or not user.is_active:
            raise InvitationRefused("email_taken")
        valid, _ = await passwords.verify_password(user.password_hash, password)
        if not valid:
            raise InvitationRefused("wrong_password")
    else:
        try:
            passwords.check_policy(password, invitation.email)
        except passwords.PasswordPolicyError as error:
            raise InvitationRefused("weak_password", str(error)) from None
        user = AppUser(id=uuid.uuid4(), email=invitation.email, password_hash=await passwords.hash_password(password),
                       first_name=guardian.first_name, last_name=guardian.last_name, role=UserRole.GUARDIAN,
                       enterprise_id=None, is_active=True, created_at=now, password_changed_at=now)
        db.add(user)
        await db.flush()
    guardian.user_id = user.id
    invitation.used_at = now
    _event(db, AuthEventType.INVITATION_ACCEPTED, client, now, user_id=user.id, email=invitation.email,
           detail=f"guardian:{guardian.id}")
    await db.commit()
    return user


# --- Consultation (parent connecté) -----------------------------------------

def _visible_children(user: AppUser):
    """Enfants dont ce compte est responsable **avec autorité parentale**, sur une fiche active.

    Un contact seulement autorisé à venir chercher l'enfant (grand-parent…) ne voit pas son dossier.
    """
    return (
        select(Child, Nursery)
        .join(ChildGuardian, ChildGuardian.child_id == Child.id)
        .join(Guardian, Guardian.id == ChildGuardian.guardian_id)
        .join(Nursery, Nursery.id == Child.nursery_id)
        .where(Guardian.user_id == user.id, Guardian.is_active, ChildGuardian.has_parental_authority)
        .distinct()
    )


async def children_of(db: AsyncSession, user: AppUser) -> list[tuple[Child, Nursery]]:
    rows = await db.execute(_visible_children(user).order_by(Child.first_name))
    return [(child, nursery) for child, nursery in rows]


async def child_of(db: AsyncSession, user: AppUser, child_id: uuid.UUID) -> tuple[Child, Nursery] | None:
    row = (await db.execute(_visible_children(user).where(Child.id == child_id))).first()
    return (row[0], row[1]) if row else None


async def contacts(db: AsyncSession, child: Child) -> list[tuple[ChildGuardian, Guardian]]:
    rows = await db.execute(
        select(ChildGuardian, Guardian).join(Guardian, Guardian.id == ChildGuardian.guardian_id)
        .where(ChildGuardian.child_id == child.id, Guardian.is_active).order_by(Guardian.first_name))
    return [(link, guardian) for link, guardian in rows]


async def attendance_between(db: AsyncSession, child: Child, start: date, end: date) -> list[Attendance]:
    statement = select(Attendance).where(Attendance.child_id == child.id, Attendance.day >= start,
                                         Attendance.day <= end).order_by(Attendance.arrived_at.desc())
    return list(await db.scalars(statement))


async def guardian_names(db: AsyncSession, ids: set[uuid.UUID]) -> dict[uuid.UUID, Guardian]:
    if not ids:
        return {}
    return {guardian.id: guardian for guardian in await db.scalars(select(Guardian).where(Guardian.id.in_(ids)))}
