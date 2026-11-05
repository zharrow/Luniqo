"""Cas d'usage du pointage et des corrections de la direction. Routes testées sur PostgreSQL (tests/integration/)."""

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime

from sqlalchemy import Select, exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.attendance import policy
from app.attendance.models import Attendance, AttendanceCorrection, CorrectionKind
from app.auth.models import AppUser
from app.children.models import Child, ChildGuardian, Guardian


class AttendanceRefused(Exception):
    """`reason` : not_found, not_expected, already_present, not_present, unknown_guardian, pickup_not_authorized ;
    pour les corrections : presence_not_found, no_change, arrival_required, pickup_without_departure et les refus de
    `policy.correction_refusal`."""

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
    corrected: bool = False


def short_name(person: AppUser | Guardian | None) -> str | None:
    """Prénom et initiale : assez pour reconnaître, sans afficher le nom complet partout."""
    if person is None:
        return None
    return f"{person.first_name} {person.last_name[:1]}." if person.last_name else person.first_name


def full_name(person: AppUser | Child) -> str:
    return " ".join(part for part in (person.first_name, person.last_name) if part)


def _presences() -> Select:
    arrival_user, departure_user = aliased(AppUser), aliased(AppUser)
    dropper, picker = aliased(Guardian), aliased(Guardian)
    return (
        select(Attendance, Child, arrival_user, departure_user, dropper, picker,
               exists().where(AttendanceCorrection.attendance_id == Attendance.id).label("corrected"))
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


async def period_presences(db: AsyncSession, nursery_id: uuid.UUID, start: date, end: date) -> list[Presence]:
    """Présences de `start` à `end` inclus, par jour puis par heure d'arrivée."""
    statement = _presences().where(Attendance.nursery_id == nursery_id, Attendance.day.between(start, end))
    rows = await db.execute(statement.order_by(Attendance.day, Attendance.arrived_at))
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


async def open_presence(db: AsyncSession, child_id: uuid.UUID, *, lock: bool = False) -> Attendance | None:
    statement = select(Attendance).where(Attendance.child_id == child_id, Attendance.departed_at.is_(None))
    # Verrou : un départ pointé sur la tablette et une correction simultanée ne s'écrasent pas.
    return await db.scalar(statement.with_for_update() if lock else statement)


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
    attendance = await open_presence(db, child.id, lock=True)
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


# --- Corrections par la direction (LUN-120) ------------------------------------

def _utc(moment: datetime | None) -> datetime | None:
    """Heure reçue avec son fuseau (celui du navigateur), rangée et renvoyée en UTC comme toutes les autres."""
    return None if moment is None else moment.astimezone(UTC)


async def _locked_child(db: AsyncSession, nursery_id: uuid.UUID, child_id: uuid.UUID) -> Child:
    """L'enfant, verrouillé : deux corrections simultanées de ses présences passent l'une après l'autre."""
    child = await db.scalar(select(Child).where(Child.id == child_id, Child.nursery_id == nursery_id)
                            .with_for_update())
    if child is None:
        raise AttendanceRefused("not_found")
    return child


async def _locked_attendance(db: AsyncSession, nursery_id: uuid.UUID,
                             attendance_id: uuid.UUID) -> tuple[Child, Attendance]:
    # Toujours l'enfant, puis la présence : le même ordre partout, pas d'interblocage.
    child_id = await db.scalar(select(Attendance.child_id).where(Attendance.id == attendance_id,
                                                                 Attendance.nursery_id == nursery_id))
    if child_id is None:
        raise AttendanceRefused("presence_not_found")
    child = await _locked_child(db, nursery_id, child_id)
    attendance = await db.scalar(select(Attendance).where(Attendance.id == attendance_id).with_for_update())
    if attendance is None:  # annulée entre les deux lectures
        raise AttendanceRefused("presence_not_found")
    return child, attendance


async def _guardian(db: AsyncSession, child: Child, guardian_id: uuid.UUID | None, *,
                    pickup: bool) -> Guardian | None:
    if guardian_id is None:
        return None
    link = await _link(db, child, guardian_id)
    if link is None:
        raise AttendanceRefused("unknown_guardian")
    if pickup and not link.is_authorized_pickup:
        raise AttendanceRefused("pickup_not_authorized")
    return await db.get(Guardian, guardian_id)


async def _others(db: AsyncSession, child_id: uuid.UUID, day: date,
                  exclude: uuid.UUID | None) -> list[policy.Interval]:
    statement = select(Attendance.arrived_at, Attendance.departed_at).where(Attendance.child_id == child_id,
                                                                             Attendance.day == day)
    if exclude is not None:
        statement = statement.where(Attendance.id != exclude)
    return [(arrived, departed) for arrived, departed in await db.execute(statement)]


def _check(day: date, arrived_at: datetime, departed_at: datetime | None, now: datetime,
           others: list[policy.Interval]) -> None:
    refusal = policy.correction_refusal(day, arrived_at, departed_at, now, others)
    if refusal is not None:
        raise AttendanceRefused(refusal)


def _journal(kind: CorrectionKind, child: Child, day: date, owner: AppUser, now: datetime, reason: str, *,
             attendance_id: uuid.UUID | None, before: Presence | None = None,
             after: tuple[datetime, datetime | None, Guardian | None, Guardian | None] | None = None,
             ) -> AttendanceCorrection:
    entry = AttendanceCorrection(id=uuid.uuid4(), nursery_id=child.nursery_id, child_id=child.id,
                                 attendance_id=attendance_id, child_name=full_name(child), day=day, kind=kind,
                                 reason=reason, corrected_at=now, corrected_by=owner.id,
                                 corrected_by_name=full_name(owner))
    if before is not None:
        entry.old_arrived_at, entry.old_departed_at = before.attendance.arrived_at, before.attendance.departed_at
        entry.old_dropped_off_by, entry.old_picked_up_by = (short_name(before.dropped_off_by),
                                                            short_name(before.picked_up_by))
    if after is not None:
        entry.new_arrived_at, entry.new_departed_at = after[0], after[1]
        entry.new_dropped_off_by, entry.new_picked_up_by = short_name(after[2]), short_name(after[3])
    return entry


async def _commit(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError:
        # Une autre présence ouverte pour l'enfant (arrivée pointée sur la tablette entre-temps).
        await db.rollback()
        raise AttendanceRefused("already_present") from None


async def add_presence(db: AsyncSession, nursery_id: uuid.UUID, child_id: uuid.UUID, owner: AppUser,
                       now: datetime, reason: str, arrived_at: datetime, departed_at: datetime | None,
                       dropped_off_by: uuid.UUID | None, picked_up_by: uuid.UUID | None) -> Presence:
    """Présence oubliée, ajoutée par la direction. Aucun employé n'est indiqué : l'auteur est dans le journal."""
    child = await _locked_child(db, nursery_id, child_id)
    arrived_at, departed_at = _utc(arrived_at), _utc(departed_at)
    day = policy.local_day(arrived_at)
    # Le statut actuel ne compte pas (un enfant parti depuis a pu venir ce jour-là) ; l'inscription, si.
    if child.enrollment_date > day:
        raise AttendanceRefused("not_expected")
    if picked_up_by is not None and departed_at is None:
        raise AttendanceRefused("pickup_without_departure")
    dropper = await _guardian(db, child, dropped_off_by, pickup=False)
    picker = await _guardian(db, child, picked_up_by, pickup=True)
    _check(day, arrived_at, departed_at, now, await _others(db, child.id, day, None))
    attendance = Attendance(id=uuid.uuid4(), child_id=child.id, nursery_id=nursery_id, day=day,
                            arrived_at=arrived_at, dropped_off_by=dropped_off_by, departed_at=departed_at,
                            picked_up_by=picked_up_by)
    db.add(attendance)
    await db.flush()
    db.add(_journal(CorrectionKind.CREATED, child, day, owner, now, reason, attendance_id=attendance.id,
                    after=(arrived_at, departed_at, dropper, picker)))
    await _commit(db)
    return await _presence(db, attendance.id)


async def correct_presence(db: AsyncSession, nursery_id: uuid.UUID, attendance_id: uuid.UUID, owner: AppUser,
                           now: datetime, reason: str, changes: dict) -> Presence:
    """Corrige les champs présents dans `changes` (arrived_at, departed_at, dropped_off_by, picked_up_by).

    `departed_at` à null rouvre la présence (départ pointé par erreur) : seulement le jour même.
    """
    child, attendance = await _locked_attendance(db, nursery_id, attendance_id)
    before = await _presence(db, attendance.id)
    changes = {field: _utc(value) if field.endswith("_at") else value for field, value in changes.items()}
    arrived = changes.get("arrived_at", attendance.arrived_at)
    if arrived is None:
        raise AttendanceRefused("arrival_required")
    departed = changes.get("departed_at", attendance.departed_at)
    dropped = changes.get("dropped_off_by", attendance.dropped_off_by)
    picked = changes.get("picked_up_by", attendance.picked_up_by)
    if departed is None:
        if changes.get("picked_up_by") is not None:
            raise AttendanceRefused("pickup_without_departure")
        picked = None
    if (arrived, departed, dropped, picked) == (attendance.arrived_at, attendance.departed_at,
                                                 attendance.dropped_off_by, attendance.picked_up_by):
        raise AttendanceRefused("no_change")
    # Seules les personnes modifiées sont revérifiées : un responsable désactivé depuis reste dans l'historique.
    dropper = (await _guardian(db, child, dropped, pickup=False) if dropped != attendance.dropped_off_by
               else before.dropped_off_by)
    picker = (await _guardian(db, child, picked, pickup=True) if picked != attendance.picked_up_by
              else before.picked_up_by)
    _check(attendance.day, arrived, departed, now, await _others(db, child.id, attendance.day, attendance.id))
    db.add(_journal(CorrectionKind.MODIFIED, child, attendance.day, owner, now, reason,
                    attendance_id=attendance.id, before=before, after=(arrived, departed, dropper, picker)))
    if departed is None:
        attendance.departure_by = None
    attendance.arrived_at, attendance.departed_at = arrived, departed
    attendance.dropped_off_by, attendance.picked_up_by = dropped, picked
    await _commit(db)
    return await _presence(db, attendance.id)


async def cancel_presence(db: AsyncSession, nursery_id: uuid.UUID, attendance_id: uuid.UUID, owner: AppUser,
                          now: datetime, reason: str) -> AttendanceCorrection:
    """Retire une présence pointée par erreur (mauvais enfant). Le journal garde ce qu'elle contenait."""
    child, attendance = await _locked_attendance(db, nursery_id, attendance_id)
    if (policy.local_day(now) - attendance.day).days > policy.CORRECTION_MAX_DAYS:
        raise AttendanceRefused("too_old")
    before = await _presence(db, attendance.id)
    entry = _journal(CorrectionKind.CANCELLED, child, attendance.day, owner, now, reason, attendance_id=None,
                     before=before)
    db.add(entry)
    await db.delete(attendance)
    await db.commit()
    return entry


async def corrections_between(db: AsyncSession, nursery_id: uuid.UUID, start: date,
                              end: date) -> list[AttendanceCorrection]:
    """Corrections des présences de `start` à `end` inclus (jour de la présence), dans l'ordre où elles ont eu lieu."""
    statement = select(AttendanceCorrection).where(AttendanceCorrection.nursery_id == nursery_id,
                                                   AttendanceCorrection.day.between(start, end))
    return list(await db.scalars(statement.order_by(AttendanceCorrection.corrected_at, AttendanceCorrection.id)))
