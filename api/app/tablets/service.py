"""Cas d'usage de la tablette : enrôlement, PIN, sessions d'action.

Les routes de ce module sont testées sur une vraie PostgreSQL
(tests/integration/) : le service travaille directement avec la session SQL,
sans dépôt en mémoire à maintenir en parallèle.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import passwords
from app.auth.models import AppUser, AuthEvent, AuthEventType, SessionKind, UserRole, UserSession
from app.auth.policy import FAILURE_WINDOW, needs_touch
from app.auth.service import Client
from app.auth.tokens import new_token, token_digest
from app.nurseries.models import Nursery, NurseryAccess
from app.tablets import policy
from app.tablets.models import TabletDevice


class PinRefused(Exception):
    """Ouverture de session par PIN refusée. `reason` : invalid, locked, not_set ou throttled."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class WrongPassword(Exception):
    pass


class TooManyAttempts(Exception):
    pass


@dataclass(frozen=True)
class TabletContext:
    device: TabletDevice
    nursery: Nursery


@dataclass(frozen=True)
class TabletActor:
    user: AppUser
    session: UserSession
    tablet: TabletContext


def _event(db: AsyncSession, kind: AuthEventType, client: Client, now: datetime, *, user_id: uuid.UUID | None = None,
           tablet_id: uuid.UUID | None = None, detail: str | None = None) -> None:
    db.add(AuthEvent(occurred_at=now, event=kind.value, user_id=user_id, tablet_id=tablet_id, ip=client.ip,
                     user_agent=client.user_agent, detail=detail))


# --- Enrôlement (direction) ---------------------------------------------------

async def enroll(db: AsyncSession, nursery: Nursery, owner: AppUser, label: str, client: Client,
                 now: datetime) -> tuple[TabletDevice, str]:
    token = new_token()
    device = TabletDevice(id=uuid.uuid4(), nursery_id=nursery.id, enterprise_id=nursery.enterprise_id, label=label,
                          token_digest=token_digest(token), created_at=now, created_by=owner.id,
                          expires_at=now + policy.DEVICE_LIFETIME)
    db.add(device)
    await db.flush()
    _event(db, AuthEventType.TABLET_ENROLLED, client, now, user_id=owner.id, tablet_id=device.id)
    await db.commit()
    return device, token


async def list_devices(db: AsyncSession, nursery_id: uuid.UUID) -> list[TabletDevice]:
    statement = select(TabletDevice).where(TabletDevice.nursery_id == nursery_id).order_by(TabletDevice.created_at)
    return list(await db.scalars(statement))


async def revoke(db: AsyncSession, nursery: Nursery, tablet_id: uuid.UUID, owner: AppUser, client: Client,
                 now: datetime) -> bool:
    device = await db.scalar(select(TabletDevice).where(TabletDevice.id == tablet_id,
                                                        TabletDevice.nursery_id == nursery.id))
    if device is None:
        return False
    if device.revoked_at is None:
        device.revoked_at = now
        await db.execute(delete(UserSession).where(UserSession.tablet_id == device.id))
        _event(db, AuthEventType.TABLET_REVOKED, client, now, user_id=owner.id, tablet_id=device.id)
        await db.commit()
    return True


# --- Tablette : appareil et personnel ----------------------------------------

async def tablet_from_token(db: AsyncSession, token: str, now: datetime) -> TabletContext | None:
    row = (await db.execute(
        select(TabletDevice, Nursery).join(Nursery, Nursery.id == TabletDevice.nursery_id)
        .where(TabletDevice.token_digest == token_digest(token))
    )).first()
    if row is None:
        return None
    device, nursery = row
    state = policy.DeviceState(expires_at=device.expires_at, revoked_at=device.revoked_at)
    if not policy.device_usable(state, nursery.is_active, now):
        return None
    if device.last_seen_at is None or needs_touch(device.last_seen_at, now):
        device.last_seen_at = now
        await db.commit()
    return TabletContext(device, nursery)


def _granted_employee(nursery: Nursery):
    """Employés actifs de l'entreprise de la crèche qui y ont un accès."""
    return (
        select(AppUser)
        .join(NurseryAccess, (NurseryAccess.user_id == AppUser.id) & (NurseryAccess.nursery_id == nursery.id))
        .where(AppUser.role == UserRole.EMPLOYEE, AppUser.is_active, AppUser.enterprise_id == nursery.enterprise_id)
    )


async def staff(db: AsyncSession, tablet: TabletContext) -> list[AppUser]:
    statement = _granted_employee(tablet.nursery).order_by(AppUser.first_name, AppUser.last_name)
    return list(await db.scalars(statement))


# --- Session d'action par PIN --------------------------------------------------

async def open_action_session(db: AsyncSession, tablet: TabletContext, user_id: uuid.UUID, pin: str, client: Client,
                              now: datetime) -> tuple[AppUser, str]:
    device = tablet.device
    recent_failures = await db.scalar(select(func.count()).select_from(AuthEvent).where(
        AuthEvent.tablet_id == device.id, AuthEvent.event == AuthEventType.PIN_FAILED.value,
        AuthEvent.occurred_at >= now - policy.DEVICE_FAILURE_WINDOW))
    if policy.device_throttled(recent_failures):
        _event(db, AuthEventType.PIN_THROTTLED, client, now, user_id=user_id, tablet_id=device.id)
        await db.commit()
        raise PinRefused("throttled")

    user = await db.scalar(_granted_employee(tablet.nursery).where(AppUser.id == user_id))
    if user is None:
        # Pas dans la liste affichée par la tablette : requête fabriquée, comptée comme un échec.
        _event(db, AuthEventType.PIN_FAILED, client, now, tablet_id=device.id, detail="unknown_employee")
        await db.commit()
        raise PinRefused("invalid")
    if user.pin_locked_at is not None:
        _event(db, AuthEventType.PIN_FAILED, client, now, user_id=user.id, tablet_id=device.id, detail="locked")
        await db.commit()
        raise PinRefused("locked")
    if user.pin_hash is None:
        raise PinRefused("not_set")

    valid, needs_rehash = await passwords.verify_password(user.pin_hash, pin)
    if not valid:
        user.pin_failed_attempts += 1
        _event(db, AuthEventType.PIN_FAILED, client, now, user_id=user.id, tablet_id=device.id, detail="bad_pin")
        if user.pin_failed_attempts >= policy.PIN_MAX_FAILURES:
            user.pin_locked_at = now
            _event(db, AuthEventType.PIN_LOCKED, client, now, user_id=user.id, tablet_id=device.id)
        await db.commit()
        raise PinRefused("locked" if user.pin_locked_at else "invalid")

    if needs_rehash:
        user.pin_hash = await passwords.hash_password(pin)
    user.pin_failed_attempts = 0
    # Une seule session d'action par tablette : la précédente est fermée.
    await db.execute(delete(UserSession).where(UserSession.tablet_id == device.id))
    token = new_token()
    db.add(UserSession(token_digest=token_digest(token), user_id=user.id, created_at=now, last_seen_at=now,
                       ip=client.ip, user_agent=client.user_agent, kind=SessionKind.TABLET.value,
                       tablet_id=device.id))
    _event(db, AuthEventType.PIN_SUCCEEDED, client, now, user_id=user.id, tablet_id=device.id)
    await db.commit()
    return user, token


async def actor_from_token(db: AsyncSession, tablet: TabletContext, token: str, now: datetime) -> TabletActor | None:
    session = await db.scalar(select(UserSession).where(UserSession.token_digest == token_digest(token)))
    if session is None or session.kind != SessionKind.TABLET.value or session.tablet_id != tablet.device.id:
        return None
    # Revérifié à chaque requête : compte désactivé ou accès retiré coupent la session.
    user = await db.scalar(_granted_employee(tablet.nursery).where(AppUser.id == session.user_id))
    if user is None or policy.action_session_expired(session.created_at, now):
        await db.delete(session)
        await db.commit()
        return None
    return TabletActor(user, session, tablet)


async def end_action_session(db: AsyncSession, actor: TabletActor, client: Client, now: datetime) -> None:
    await db.delete(actor.session)
    _event(db, AuthEventType.TABLET_SESSION_ENDED, client, now, user_id=actor.user.id,
           tablet_id=actor.tablet.device.id)
    await db.commit()


# --- PIN : choix par l'employé, déblocage par la direction --------------------

PIN_SET_MAX_REFUSALS = 5


async def set_pin(db: AsyncSession, user: AppUser, password: str, pin: str, client: Client, now: datetime) -> None:
    """L'employé choisit son PIN, depuis sa session web, en confirmant son mot de passe."""
    refusals = await db.scalar(select(func.count()).select_from(AuthEvent).where(
        AuthEvent.user_id == user.id, AuthEvent.event == AuthEventType.PIN_SET_REFUSED.value,
        AuthEvent.occurred_at >= now - FAILURE_WINDOW))
    if refusals >= PIN_SET_MAX_REFUSALS:
        raise TooManyAttempts
    valid, _ = await passwords.verify_password(user.password_hash, password)
    if not valid:
        _event(db, AuthEventType.PIN_SET_REFUSED, client, now, user_id=user.id, detail="bad_password")
        await db.commit()
        raise WrongPassword
    policy.check_pin(pin)
    user.pin_hash = await passwords.hash_password(pin)
    user.pin_failed_attempts = 0
    user.pin_locked_at = None
    # Le PIN change : les sessions d'action ouvertes avec l'ancien sont fermées.
    await db.execute(delete(UserSession).where(UserSession.user_id == user.id,
                                               UserSession.kind == SessionKind.TABLET.value))
    _event(db, AuthEventType.PIN_SET, client, now, user_id=user.id)
    await db.commit()


async def unlock_pin(db: AsyncSession, owner: AppUser, employee_id: uuid.UUID, client: Client, now: datetime) -> bool:
    employee = await db.scalar(select(AppUser).where(AppUser.id == employee_id, AppUser.role == UserRole.EMPLOYEE,
                                                     AppUser.enterprise_id == owner.enterprise_id))
    if employee is None:
        return False
    employee.pin_failed_attempts = 0
    employee.pin_locked_at = None
    _event(db, AuthEventType.PIN_UNLOCKED, client, now, user_id=employee.id, detail=f"by:{owner.id}")
    await db.commit()
    return True
