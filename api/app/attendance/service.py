"""Cas d'usage du pointage. Routes testées sur PostgreSQL (tests/integration/)."""

import uuid
from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.attendance import policy
from app.attendance.models import Attendance
from app.auth.models import AppUser
from app.children.models import Child, ChildGuardian, Guardian


class AttendanceRefused(Exception):
    """`reason` : not_found, not_expected, already_present, not_present, unknown_guardian, pickup_not_authorized."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class Presence:
    """Présence avec les noms utiles à l'affichage (enfant, employés, responsables)."""

    attendance: Attendance
    child: Child
    arrival_by: AppUser | None
    departure_by: AppUser | None
    dropped_off_by: Guardian | None
    picked_up_by: Guardian | None


def _presences() -> Select:
    arrival_user, departure_user = aliased(AppUser), aliased(AppUser)
    dropper, picker = aliased(Guardian), aliased(Guardian)
    return (
        select(Attendance, Child, arrival_user, departure_user, dropper, picker)
        .join(Child, Child.id == Attendance.child_id)
        .outerjoin(arrival_user, arrival_user.id == Attendance.arrival_by)
        .outerjoin(departure_user, departure_user.id == Attendance.departure_by)
        .outerjoin(dropper, dropper.id == Attendance.dropped_off_by)
        .outerjoin(picker, picker.id == Attendance.picked_up_by)
    )


async def day_presences(db: AsyncSession, nursery_id: uuid.UUID, day: date) -> list[Presence]:
    statement = _presences().where(Attendance.nursery_id == nursery_id, Attendance.day == day)
    rows = await db.execute(statement.order_by(Attendance.arrived_at))
    return [Presence(*row) for row in rows]


async def present_now(db: AsyncSession, nursery_id: uuid.UUID) -> list[Presence]:
    statement = _presences().where(Attendance.nursery_id == nursery_id, Attendance.departed_at.is_(None))
    rows = await db.execute(statement.order_by(Child.last_name, Child.first_name))
    return [Presence(*row) for row in rows]


async def _presence(db: AsyncSession, attendance_id: uuid.UUID) -> Presence:
    return Presence(*(await db.execute(_presences().where(Attendance.id == attendance_id))).one())


async def _child_in(db: AsyncSession, nursery_id: uuid.UUID, child_id: uuid.UUID) -> Child:
    child = await db.scalar(select(Child).where(Child.id == child_id, Child.nursery_id == nursery_id))
    if child is None:
        raise AttendanceRefused("not_found")
    return child


async def _link(db: AsyncSession, child: Child, guardian_id: uuid.UUID) -> ChildGuardian | None:
    return await db.scalar(
        select(ChildGuardian).join(Guardian, Guardian.id == ChildGuardian.guardian_id)
        .where(ChildGuardian.child_id == child.id, ChildGuardian.guardian_id == guardian_id, Guardian.is_active))


async def open_presence(db: AsyncSession, child_id: uuid.UUID) -> Attendance | None:
    return await db.scalar(select(Attendance).where(Attendance.child_id == child_id, Attendance.departed_at.is_(None)))


async def arrive(db: AsyncSession, nursery_id: uuid.UUID, child_id: uuid.UUID, employee: AppUser, now: datetime,
                 dropped_off_by: uuid.UUID | None) -> Presence:
    child = await _child_in(db, nursery_id, child_id)
    day = policy.local_day(now)
    if not policy.can_attend(child.status, child.enrollment_date, day):
        raise AttendanceRefused("not_expected")
    if dropped_off_by is not None and await _link(db, child, dropped_off_by) is None:
        raise AttendanceRefused("unknown_guardian")
    if await open_presence(db, child.id) is not None:
        raise AttendanceRefused("already_present")
    attendance = Attendance(id=uuid.uuid4(), child_id=child.id, nursery_id=nursery_id, day=day, arrived_at=now,
                            arrival_by=employee.id, dropped_off_by=dropped_off_by)
    db.add(attendance)
    try:
        await db.commit()
    except IntegrityError:
        # Deux arrivées simultanées (double appui) : l'index unique partiel garde la première.
        await db.rollback()
        raise AttendanceRefused("already_present") from None
    return await _presence(db, attendance.id)


async def depart(db: AsyncSession, nursery_id: uuid.UUID, child_id: uuid.UUID, employee: AppUser, now: datetime,
                 picked_up_by: uuid.UUID) -> Presence:
    child = await _child_in(db, nursery_id, child_id)
    attendance = await open_presence(db, child.id)
    if attendance is None:
        raise AttendanceRefused("not_present")
    link = await _link(db, child, picked_up_by)
    if link is None or not link.is_authorized_pickup:
        # Règle de sécurité centrale : l'enfant ne part qu'avec une personne autorisée pour lui.
        raise AttendanceRefused("pickup_not_authorized")
    attendance.departed_at = max(now, attendance.arrived_at)
    attendance.departure_by = employee.id
    attendance.picked_up_by = picked_up_by
    await db.commit()
    return await _presence(db, attendance.id)


async def expected_children(db: AsyncSession, nursery_id: uuid.UUID, day: date) -> list[Child]:
    statement = select(Child).where(Child.nursery_id == nursery_id, Child.status.in_(policy.CAN_ATTEND),
                                    Child.enrollment_date <= day).order_by(Child.first_name, Child.last_name)
    return list(await db.scalars(statement))


async def guardians_of(db: AsyncSession, child_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[tuple[ChildGuardian,
                                                                                                    Guardian]]]:
    result: dict[uuid.UUID, list[tuple[ChildGuardian, Guardian]]] = {child_id: [] for child_id in child_ids}
    if child_ids:
        rows = await db.execute(
            select(ChildGuardian, Guardian).join(Guardian, Guardian.id == ChildGuardian.guardian_id)
            .where(ChildGuardian.child_id.in_(child_ids), Guardian.is_active)
            .order_by(Guardian.first_name))
        for link, guardian in rows:
            result[link.child_id].append((link, guardian))
    return result


async def today_by_child(db: AsyncSession, nursery_id: uuid.UUID, day: date) -> dict[uuid.UUID, Attendance]:
    """Dernière présence du jour de chaque enfant."""
    rows = await db.scalars(select(Attendance).where(Attendance.nursery_id == nursery_id, Attendance.day == day)
                            .order_by(Attendance.arrived_at))
    return {attendance.child_id: attendance for attendance in rows}
