"""Routes de la fiche de ménage : catalogue des tâches (/api/v2/cleaning-tasks) et pièces des crèches.

Le catalogue appartient à l'entreprise : seule la direction le lit et le
modifie. Les pièces passent par `ReadableNursery` (lecture : direction,
employés ayant accès à la crèche) ou `ManagedNursery` (écriture : direction).
Une tâche ou une pièce d'une autre entreprise ou d'une autre crèche répond
404, comme un identifiant inexistant.
"""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.attendance.policy import local_day
from app.auth.dependencies import NowDep
from app.cleaning import service
from app.cleaning.models import CleaningTask, Room, RoomTask
from app.cleaning.schemas import (
    DayPlan,
    PlannedRoom,
    PlannedTask,
    RoomCreate,
    RoomDetail,
    RoomOut,
    RoomTaskIn,
    RoomTaskOut,
    RoomUpdate,
    TaskCreate,
    TaskOut,
    TaskUpdate,
)
from app.db import SessionDep
from app.nurseries.dependencies import ManagedNursery, OwnerUser, ReadableNursery

router = APIRouter(prefix="/api/v2", tags=["ménage"])

_NOT_FOUND = {status.HTTP_404_NOT_FOUND: {"description": "Inexistant ou hors de cette crèche ou entreprise"}}
_CONFLICT = {status.HTTP_409_CONFLICT: {"description": "Nom déjà pris"}}

# Contrainte d'unicité → message du 409. Toute autre violation reste une erreur 500 : elle signalerait un défaut.
_DUPLICATES = {
    "uq_cleaning_task_enterprise_name": "Une tâche du catalogue porte déjà ce nom",
    "uq_room_nursery_name": "Une pièce de cette crèche porte déjà ce nom",
    "uq_room_task_room_task": "Cette tâche vient d'être ajoutée à la pièce : recharger",
}


async def _commit(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        for constraint, message in _DUPLICATES.items():
            if constraint in str(error.orig):
                raise HTTPException(status.HTTP_409_CONFLICT, message) from None
        raise


def _apply(target, changes: dict, required: tuple[str, ...]) -> None:
    for field in required:
        if field in changes and changes[field] is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Le champ {field} ne peut pas être vide")
    for field, value in changes.items():
        setattr(target, field, value)


def _room_task_out(assignment: service.Assignment) -> RoomTaskOut:
    room_task = assignment.room_task
    return RoomTaskOut(id=room_task.id, task=TaskOut.model_validate(assignment.task), frequency=room_task.frequency,
                       weekdays=room_task.weekdays, display_order=room_task.display_order,
                       is_active=room_task.is_active)


# --- Catalogue de l'entreprise ----------------------------------------------------

async def _task_of(db: AsyncSession, enterprise_id: uuid.UUID, task_id: uuid.UUID) -> CleaningTask:
    task = await db.scalar(select(CleaningTask).where(CleaningTask.id == task_id,
                                                      CleaningTask.enterprise_id == enterprise_id))
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tâche introuvable")
    return task


@router.get("/cleaning-tasks")
async def list_tasks(user: OwnerUser, db: SessionDep,
                     include_inactive: Annotated[bool, Query()] = False) -> list[TaskOut]:
    """Catalogue des tâches de ménage de l'entreprise, commun à toutes ses crèches."""
    statement = select(CleaningTask).where(CleaningTask.enterprise_id == user.enterprise_id)
    if not include_inactive:
        statement = statement.where(CleaningTask.is_active)
    return [TaskOut.model_validate(task) for task in await db.scalars(statement.order_by(CleaningTask.name))]


@router.post("/cleaning-tasks", status_code=status.HTTP_201_CREATED, responses=_CONFLICT)
async def create_task(body: TaskCreate, user: OwnerUser, db: SessionDep) -> TaskOut:
    task = CleaningTask(id=uuid.uuid4(), enterprise_id=user.enterprise_id, is_active=True, **body.model_dump())
    db.add(task)
    await _commit(db)
    return TaskOut.model_validate(task)


@router.patch("/cleaning-tasks/{task_id}", responses=_NOT_FOUND | _CONFLICT)
async def update_task(task_id: uuid.UUID, body: TaskUpdate, user: OwnerUser, db: SessionDep) -> TaskOut:
    """Renommer, préciser la consigne, désactiver : la tâche disparaît alors des fiches de toutes les crèches."""
    task = await _task_of(db, user.enterprise_id, task_id)
    _apply(task, body.model_dump(exclude_unset=True), ("name", "is_active"))
    await _commit(db)
    return TaskOut.model_validate(task)


# --- Pièces d'une crèche ----------------------------------------------------------

async def _room_in(db: AsyncSession, nursery_id: uuid.UUID, room_id: uuid.UUID) -> Room:
    room = await db.scalar(select(Room).where(Room.id == room_id, Room.nursery_id == nursery_id))
    if room is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pièce introuvable")
    return room


@router.get("/nurseries/{nursery_id}/rooms")
async def list_rooms(context: ReadableNursery, db: SessionDep,
                     include_inactive: Annotated[bool, Query()] = False) -> list[RoomOut]:
    statement = select(Room).where(Room.nursery_id == context.nursery.id)
    if not include_inactive:
        statement = statement.where(Room.is_active)
    rooms = await db.scalars(statement.order_by(Room.display_order, Room.name))
    return [RoomOut.model_validate(room) for room in rooms]


@router.post("/nurseries/{nursery_id}/rooms", status_code=status.HTTP_201_CREATED, responses=_CONFLICT)
async def create_room(body: RoomCreate, context: ManagedNursery, db: SessionDep) -> RoomOut:
    room = Room(id=uuid.uuid4(), nursery_id=context.nursery.id, is_active=True, **body.model_dump())
    db.add(room)
    await _commit(db)
    return RoomOut.model_validate(room)


@router.get("/nurseries/{nursery_id}/rooms/{room_id}", responses=_NOT_FOUND)
async def get_room(room_id: uuid.UUID, context: ReadableNursery, db: SessionDep) -> RoomDetail:
    """La pièce et toutes ses tâches, désactivées comprises, dans l'ordre de la fiche."""
    room = await _room_in(db, context.nursery.id, room_id)
    tasks = [_room_task_out(assignment) for assignment in await service.room_assignments(db, room.id)]
    return RoomDetail(**RoomOut.model_validate(room).model_dump(), tasks=tasks)


@router.patch("/nurseries/{nursery_id}/rooms/{room_id}", responses=_NOT_FOUND | _CONFLICT)
async def update_room(room_id: uuid.UUID, body: RoomUpdate, context: ManagedNursery, db: SessionDep) -> RoomOut:
    room = await _room_in(db, context.nursery.id, room_id)
    _apply(room, body.model_dump(exclude_unset=True), ("name", "display_order", "is_active"))
    await _commit(db)
    return RoomOut.model_validate(room)


@router.put("/nurseries/{nursery_id}/rooms/{room_id}/tasks/{task_id}", responses=_NOT_FOUND | _CONFLICT)
async def set_room_task(room_id: uuid.UUID, task_id: uuid.UUID, body: RoomTaskIn, context: ManagedNursery,
                        db: SessionDep) -> RoomTaskOut:
    """Prévoit une tâche du catalogue dans la pièce, ou remplace sa fréquence. `is_active: false` la retire."""
    room = await _room_in(db, context.nursery.id, room_id)
    task = await _task_of(db, context.nursery.enterprise_id, task_id)
    if body.is_active and not task.is_active:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Tâche désactivée dans le catalogue")
    room_task = await db.scalar(select(RoomTask).where(RoomTask.room_id == room.id, RoomTask.task_id == task.id))
    if room_task is None:
        room_task = RoomTask(id=uuid.uuid4(), room_id=room.id, task_id=task.id, nursery_id=room.nursery_id,
                             enterprise_id=context.nursery.enterprise_id)
        db.add(room_task)
    for field, value in body.model_dump().items():
        setattr(room_task, field, value)
    await _commit(db)
    return _room_task_out(service.Assignment(room_task, task))


# --- Fiche du jour ----------------------------------------------------------------

@router.get("/nurseries/{nursery_id}/cleaning/plan")
async def day_plan(context: ReadableNursery, db: SessionDep, now: NowDep,
                   day: Annotated[date | None, Query()] = None) -> DayPlan:
    """Tâches prévues un jour donné (aujourd'hui, heure de Paris, par défaut), pièce par pièce."""
    day = day or local_day(now)
    rooms = [PlannedRoom(room_id=room.id, name=room.name,
                         tasks=[PlannedTask(room_task_id=a.room_task.id, task_id=a.task.id, name=a.task.name,
                                            instructions=a.task.instructions) for a in assignments])
             for room, assignments in await service.day_plan(db, context.nursery.id, day)]
    return DayPlan(day=day, rooms=rooms)
