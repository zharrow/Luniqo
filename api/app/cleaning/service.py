"""Lectures du ménage partagées par les routes de la direction et, demain, de la tablette (LUN-77)."""

import uuid
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cleaning import policy
from app.cleaning.models import CleaningTask, Room, RoomTask


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
