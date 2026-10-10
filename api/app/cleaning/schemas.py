import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.cleaning import policy
from app.cleaning.models import Frequency


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    display_order: int = Field(default=0, ge=0)


class RoomUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    display_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nursery_id: uuid.UUID
    name: str
    description: str | None
    display_order: int
    is_active: bool


class TaskCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    instructions: str | None = Field(default=None, max_length=1000)


class TaskUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    instructions: str | None = Field(default=None, max_length=1000)
    is_active: bool | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    instructions: str | None
    is_active: bool


class RoomTaskIn(BaseModel):
    """Affectation complète (PUT) : fréquence, jours, ordre dans la pièce, active ou non."""

    frequency: Frequency
    weekdays: list[int] | None = Field(default=None, description="ISO : 1 = lundi … 7 = dimanche")
    display_order: int = Field(default=0, ge=0)
    is_active: bool = True

    @model_validator(mode="after")
    def jours_coherents(self) -> RoomTaskIn:
        self.weekdays = policy.normalize_weekdays(self.frequency, self.weekdays)
        return self


class RoomTaskOut(BaseModel):
    id: uuid.UUID
    task: TaskOut
    frequency: Frequency
    weekdays: list[int] | None
    display_order: int
    is_active: bool


class RoomDetail(RoomOut):
    tasks: list[RoomTaskOut]


class PlannedTask(BaseModel):
    room_task_id: uuid.UUID
    task_id: uuid.UUID
    name: str
    instructions: str | None


class PlannedRoom(BaseModel):
    room_id: uuid.UUID
    name: str
    tasks: list[PlannedTask]


class DayPlan(BaseModel):
    day: date
    rooms: list[PlannedRoom]


def short_name(full_name: str) -> str:
    """Prénom et initiale (« Lucas B. ») : assez pour reconnaître sur la tablette."""
    first, _, last = full_name.partition(" ")
    return f"{first} {last[:1]}." if last else first


class SheetTask(PlannedTask):
    done_at: datetime | None
    done_by: str | None


class SheetRoom(BaseModel):
    room_id: uuid.UUID
    name: str
    tasks: list[SheetTask]


class TabletSheet(BaseModel):
    day: date
    rooms: list[SheetRoom]


class CheckOut(BaseModel):
    id: uuid.UUID
    room_task_id: uuid.UUID
    day: date
    room_name: str
    task_name: str
    done_at: datetime
    done_by: str


class CheckRecord(BaseModel):
    """Ligne de l'historique : noms tels qu'au moment de la coche, auteur en nom complet (contrôle)."""

    id: uuid.UUID
    day: date
    room_id: uuid.UUID
    room_name: str
    task_name: str
    done_at: datetime
    done_by: str
    cancelled_at: datetime | None
    cancelled_by: str | None
