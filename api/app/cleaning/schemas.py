import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.cleaning import policy
from app.cleaning.models import Frequency


class RoomCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"name": "Salle d'activité", "description": "Grande salle, tapis et jeux", "display_order": 1}]})

    name: str = Field(min_length=1, max_length=100, description="Unique dans la crèche")
    description: str | None = Field(default=None, max_length=500)
    display_order: int = Field(default=0, ge=0, description="Rang de la pièce sur la fiche (croissant)")


class RoomUpdate(BaseModel):
    """Champs absents : inchangés. Une pièce se désactive, elle ne se supprime pas."""

    model_config = ConfigDict(json_schema_extra={"examples": [{"display_order": 2}, {"is_active": False}]})

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
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"name": "Désinfecter les plans de change", "instructions": "Produit virucide, laisser agir 5 minutes"}]})

    name: str = Field(min_length=1, max_length=150, description="Unique dans le catalogue de l'entreprise")
    instructions: str | None = Field(default=None, max_length=1000, description="Consigne affichée sur la tablette")


class TaskUpdate(BaseModel):
    """Champs absents : inchangés. Désactivée, la tâche disparaît des fiches de toutes les crèches."""

    model_config = ConfigDict(json_schema_extra={"examples": [{"instructions": "Produit virucide, rincer"}]})

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

    model_config = ConfigDict(json_schema_extra={"examples": [
        {"frequency": "daily"}, {"frequency": "weekly", "weekdays": [1, 4]},
        {"frequency": "monthly", "weekdays": [1], "display_order": 3}]})

    frequency: Frequency = Field(description="daily : chaque jour ; weekly : les jours de `weekdays` ; monthly : "
                                             "le premier jour `weekdays` du mois")
    weekdays: list[int] | None = Field(default=None, description="ISO : 1 = lundi … 7 = dimanche. Absent pour "
                                                                 "daily, un seul jour pour monthly")
    display_order: int = Field(default=0, ge=0, description="Rang de la tâche dans la pièce")
    is_active: bool = Field(default=True, description="Faux : la tâche n'est plus prévue dans cette pièce")

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
    done_at: datetime | None = Field(description="Heure de la coche du jour ; null si la tâche reste à faire")
    done_by: str | None = Field(description="Employé qui l'a cochée (prénom et initiale)")


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
    cancelled_at: datetime | None = Field(description="Coche annulée (décochée le jour même)")
    cancelled_by: str | None
