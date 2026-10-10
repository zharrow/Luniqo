"""Fiche de ménage : lectures communes à la direction et à la tablette, coches depuis la tablette (LUN-77)."""

import uuid
from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.attendance.policy import local_day
from app.auth.models import AppUser
from app.cleaning import policy
from app.cleaning.models import CleaningCheck, CleaningTask, Room, RoomTask


class CheckRefused(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class Assignment:
    room_task: RoomTask
    task: CleaningTask


async def room_assignments(db: AsyncSession, room_id: uuid.UUID) -> list[Assignment]:
    """Toutes les tâches d'une pièce, actives ou non, dans l'ordre de la fiche."""
    rows = await db.execute(
        select(RoomTask, CleaningTask).join(CleaningTask, CleaningTask.id == RoomTask.task_id)
        .where(RoomTask.room_id == room_id).order_by(RoomTask.display_order, CleaningTask.name))
    return [Assignment(room_task, task) for room_task, task in rows]


async def day_plan(db: AsyncSession, nursery_id: uuid.UUID, day: date) -> list[tuple[Room, list[Assignment]]]:
    """Pièces de la crèche et tâches prévues ce jour-là. Pièce, tâche ou affectation désactivée : absente."""
    rows = await db.execute(
        select(Room, RoomTask, CleaningTask)
        .join(RoomTask, RoomTask.room_id == Room.id)
        .join(CleaningTask, CleaningTask.id == RoomTask.task_id)
        .where(Room.nursery_id == nursery_id, Room.is_active, RoomTask.is_active, CleaningTask.is_active)
        .order_by(Room.display_order, Room.name, RoomTask.display_order, CleaningTask.name))
    plan: dict[uuid.UUID, tuple[Room, list[Assignment]]] = {}
    for room, room_task, task in rows:
        if policy.is_due(room_task.frequency, room_task.weekdays, day):
            plan.setdefault(room.id, (room, []))[1].append(Assignment(room_task, task))
    return list(plan.values())


async def checks_of_day(db: AsyncSession, nursery_id: uuid.UUID, day: date) -> dict[uuid.UUID, CleaningCheck]:
    """Coches non annulées d'un jour, par affectation."""
    checks = await db.scalars(select(CleaningCheck).where(
        CleaningCheck.nursery_id == nursery_id, CleaningCheck.day == day, CleaningCheck.cancelled_at.is_(None)))
    return {check.room_task_id: check for check in checks}


def _full_name(user: AppUser) -> str:
    return f"{user.first_name} {user.last_name}".strip()


async def check(db: AsyncSession, nursery_id: uuid.UUID, room_task_id: uuid.UUID, employee: AppUser,
                now: datetime) -> CleaningCheck:
    """Coche une tâche prévue aujourd'hui (heure de Paris), à l'heure du serveur."""
    row = (await db.execute(
        select(RoomTask, Room, CleaningTask).join(Room, Room.id == RoomTask.room_id)
        .join(CleaningTask, CleaningTask.id == RoomTask.task_id)
        .where(RoomTask.id == room_task_id, RoomTask.nursery_id == nursery_id))).first()
    if row is None:
        raise CheckRefused("not_found")
    room_task, room, task = row
    day = local_day(now)
    if not policy.can_check(room_active=room.is_active, task_active=task.is_active,
                            assignment_active=room_task.is_active, frequency=room_task.frequency,
                            weekdays=room_task.weekdays, day=day):
        raise CheckRefused("not_planned")
    if room_task.id in await checks_of_day(db, nursery_id, day):
        raise CheckRefused("already_done")
    done = CleaningCheck(id=uuid.uuid4(), room_task_id=room_task.id, nursery_id=nursery_id, day=day,
                         room_name=room.name, task_name=task.name, done_at=now, done_by=employee.id,
                         done_by_name=_full_name(employee))
    db.add(done)
    try:
        await db.commit()
    except IntegrityError:
        # Deux coches simultanées (deux tablettes, double appui) : l'index unique partiel garde la première.
        await db.rollback()
        raise CheckRefused("already_done") from None
    return done


async def uncheck(db: AsyncSession, nursery_id: uuid.UUID, room_task_id: uuid.UUID, employee: AppUser,
                  now: datetime) -> None:
    """Annule la coche du jour : la ligne reste, marquée annulée. Les jours passés ne se décochent pas ici."""
    done = (await checks_of_day(db, nursery_id, local_day(now))).get(room_task_id)
    if done is None:
        raise CheckRefused("not_done")
    done.cancelled_at, done.cancelled_by, done.cancelled_by_name = now, employee.id, _full_name(employee)
    await db.commit()


@dataclass(frozen=True)
class Record:
    check: CleaningCheck
    room_id: uuid.UUID


async def history(db: AsyncSession, nursery_id: uuid.UUID, start: date, end: date,
                  room_id: uuid.UUID | None = None) -> list[Record]:
    """Coches d'une période, annulées comprises, dans l'ordre chronologique (LUN-78).

    Seules les coches existent pour le passé : ce qui était prévu un jour donné
    ne se reconstitue pas, la configuration ayant pu changer depuis.
    """
    statement = (select(CleaningCheck, RoomTask.room_id).join(RoomTask, RoomTask.id == CleaningCheck.room_task_id)
                 .where(CleaningCheck.nursery_id == nursery_id, CleaningCheck.day.between(start, end)))
    if room_id is not None:
        statement = statement.where(RoomTask.room_id == room_id)
    rows = await db.execute(statement.order_by(CleaningCheck.day, CleaningCheck.room_name, CleaningCheck.done_at))
    return [Record(check, room) for check, room in rows]
