"""Routes de la fiche de ménage : catalogue des tâches (/api/v2/cleaning-tasks), pièces des crèches, tablette.

Le catalogue appartient à l'entreprise : seule la direction le lit et le
modifie. Les pièces passent par `ReadableNursery` (lecture : direction,
employés ayant accès à la crèche) ou `ManagedNursery` (écriture : direction).
Une tâche ou une pièce d'une autre entreprise ou d'une autre crèche répond
404, comme un identifiant inexistant.

Sur la tablette (`/api/v2/tablet/cleaning…`), l'employé identifié par PIN
(`CurrentActor`) coche les tâches du jour de la crèche de la tablette.
"""

import csv
import io
import uuid
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.attendance.policy import NURSERY_TZ, local_day
from app.auth.dependencies import NowDep
from app.cleaning import policy, service
from app.cleaning.models import CleaningTask, Room, RoomTask
from app.cleaning.schemas import (
    CheckOut,
    CheckRecord,
    DayPlan,
    PlannedRoom,
    PlannedTask,
    RoomCreate,
    RoomDetail,
    RoomOut,
    RoomTaskIn,
    RoomTaskOut,
    RoomUpdate,
    SheetRoom,
    SheetTask,
    TabletSheet,
    TaskCreate,
    TaskOut,
    TaskUpdate,
    short_name,
)
from app.db import SessionDep
from app.nurseries.dependencies import ManagedNursery, OwnerUser, ReadableNursery
from app.tablets.dependencies import CurrentActor

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


# --- Historique ---------------------------------------------------------------------

async def _history(context, db: AsyncSession, now: datetime, start: date | None, end: date | None,
                   room_id: uuid.UUID | None) -> tuple[date, date, list[service.Record]]:
    try:
        start, end = policy.history_range(start, end, local_day(now))
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from None
    if room_id is not None:
        await _room_in(db, context.nursery.id, room_id)
    return start, end, await service.history(db, context.nursery.id, start, end, room_id)


FromQuery = Annotated[date | None, Query(alias="from", description="Premier jour (7 jours avant `to` par défaut)")]
ToQuery = Annotated[date | None, Query(alias="to", description="Dernier jour (aujourd'hui à Paris par défaut)")]
RoomQuery = Annotated[uuid.UUID | None, Query(description="Une seule pièce")]


@router.get("/nurseries/{nursery_id}/cleaning/history", responses=_NOT_FOUND)
async def cleaning_history(context: ReadableNursery, db: SessionDep, now: NowDep, start: FromQuery = None,
                           end: ToQuery = None, room_id: RoomQuery = None) -> list[CheckRecord]:
    """Tâches cochées sur une période (366 jours au plus), annulées comprises, dans l'ordre chronologique.

    Les noms sont ceux du jour de la coche. Ce qui était prévu et n'a pas été
    fait n'est pas reconstitué pour le passé : la configuration a pu changer.
    """
    _, _, records = await _history(context, db, now, start, end, room_id)
    return [CheckRecord(id=r.check.id, day=r.check.day, room_id=r.room_id, room_name=r.check.room_name,
                        task_name=r.check.task_name, done_at=r.check.done_at, done_by=r.check.done_by_name,
                        cancelled_at=r.check.cancelled_at, cancelled_by=r.check.cancelled_by_name) for r in records]


def _local_time(moment: datetime | None) -> str:
    return moment.astimezone(NURSERY_TZ).strftime("%H:%M") if moment else ""


@router.get("/nurseries/{nursery_id}/cleaning/history.csv", response_class=Response,
            responses={200: {"content": {"text/csv": {}}, "description": "Fiches au format CSV (tableur)"}}
            | _NOT_FOUND)
async def cleaning_history_csv(context: ReadableNursery, db: SessionDep, now: NowDep, start: FromQuery = None,
                               end: ToQuery = None, room_id: RoomQuery = None) -> Response:
    """Mêmes lignes que l'historique, à ouvrir dans un tableur ou à imprimer pour un contrôle.

    Séparateur « ; » et BOM UTF-8 : un tableur réglé en français l'ouvre avec ses accents. Heures en heure de Paris.
    """
    start, end, records = await _history(context, db, now, start, end, room_id)
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";", lineterminator="\r\n")
    writer.writerow(["Jour", "Pièce", "Tâche", "Faite à", "Par", "Annulée à", "Annulée par"])
    for record in records:
        check = record.check
        writer.writerow([check.day.strftime("%d/%m/%Y"), policy.csv_cell(check.room_name),
                         policy.csv_cell(check.task_name), _local_time(check.done_at),
                         policy.csv_cell(check.done_by_name), _local_time(check.cancelled_at),
                         policy.csv_cell(check.cancelled_by_name)])
    filename = f"fiches-menage_{start.isoformat()}_{end.isoformat()}.csv"
    return Response("\ufeff" + buffer.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"',
                             "Cache-Control": "no-store"})


# --- Tablette ---------------------------------------------------------------------

_REFUSALS = {
    "not_found": (status.HTTP_404_NOT_FOUND, "Tâche introuvable dans cette crèche"),
    "not_planned": (status.HTTP_409_CONFLICT, "Cette tâche n'est pas prévue aujourd'hui"),
    "already_done": (status.HTTP_409_CONFLICT, "Tâche déjà cochée aujourd'hui"),
    "not_done": (status.HTTP_409_CONFLICT, "Cette tâche n'est pas cochée aujourd'hui"),
}


def _refused(refusal: service.CheckRefused) -> HTTPException:
    code, message = _REFUSALS[refusal.reason]
    return HTTPException(code, message)


@router.get("/tablet/cleaning")
async def tablet_sheet(actor: CurrentActor, db: SessionDep, now: NowDep) -> TabletSheet:
    """Fiche du jour de la crèche de la tablette : tâches prévues, pièce par pièce, et celles déjà cochées."""
    nursery_id, day = actor.tablet.nursery.id, local_day(now)
    done = await service.checks_of_day(db, nursery_id, day)
    rooms = []
    for room, assignments in await service.day_plan(db, nursery_id, day):
        tasks = []
        for a in assignments:
            check = done.get(a.room_task.id)
            tasks.append(SheetTask(room_task_id=a.room_task.id, task_id=a.task.id, name=a.task.name,
                                   instructions=a.task.instructions, done_at=check.done_at if check else None,
                                   done_by=short_name(check.done_by_name) if check else None))
        rooms.append(SheetRoom(room_id=room.id, name=room.name, tasks=tasks))
    return TabletSheet(day=day, rooms=rooms)


@router.post("/tablet/cleaning/{room_task_id}/check", status_code=status.HTTP_201_CREATED)
async def tablet_check(room_task_id: uuid.UUID, actor: CurrentActor, db: SessionDep, now: NowDep) -> CheckOut:
    """Coche une tâche prévue aujourd'hui. Heure et auteur fixés par le serveur, pas saisis sur la tablette."""
    try:
        done = await service.check(db, actor.tablet.nursery.id, room_task_id, actor.user, now)
    except service.CheckRefused as refusal:
        raise _refused(refusal) from None
    return CheckOut(id=done.id, room_task_id=done.room_task_id, day=done.day, room_name=done.room_name,
                    task_name=done.task_name, done_at=done.done_at, done_by=short_name(done.done_by_name))


@router.delete("/tablet/cleaning/{room_task_id}/check", status_code=status.HTTP_204_NO_CONTENT)
async def tablet_uncheck(room_task_id: uuid.UUID, actor: CurrentActor, db: SessionDep, now: NowDep) -> None:
    """Décoche une tâche cochée par erreur aujourd'hui. La coche reste dans l'historique, marquée annulée."""
    try:
        await service.uncheck(db, actor.tablet.nursery.id, room_task_id, actor.user, now)
    except service.CheckRefused as refusal:
        raise _refused(refusal) from None
