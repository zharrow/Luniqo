import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.attendance.service import Presence
from app.auth.models import AppUser
from app.children.models import Guardian, Relationship


def _short(person: AppUser | Guardian | None) -> str | None:
    """Prénom et initiale : assez pour reconnaître, sans afficher le nom complet partout."""
    if person is None:
        return None
    return f"{person.first_name} {person.last_name[:1]}." if person.last_name else person.first_name


class AttendanceOut(BaseModel):
    id: uuid.UUID
    child_id: uuid.UUID
    child_name: str
    day: date = Field(description="Jour de la présence, à Paris")
    arrived_at: datetime
    arrival_by: str | None = Field(description="Employé qui a pointé l'arrivée (prénom et initiale)")
    dropped_off_by: str | None = Field(description="Responsable qui a amené l'enfant, s'il a été indiqué")
    departed_at: datetime | None = Field(description="Null tant que l'enfant est présent")
    departure_by: str | None = Field(description="Employé qui a pointé le départ")
    picked_up_by: str | None = Field(description="Responsable venu chercher l'enfant")

    @classmethod
    def of(cls, presence: Presence) -> AttendanceOut:
        attendance, child = presence.attendance, presence.child
        return cls(id=attendance.id, child_id=child.id, child_name=f"{child.first_name} {child.last_name}",
                   day=attendance.day, arrived_at=attendance.arrived_at, arrival_by=_short(presence.arrival_by),
                   dropped_off_by=_short(presence.dropped_off_by), departed_at=attendance.departed_at,
                   departure_by=_short(presence.departure_by), picked_up_by=_short(presence.picked_up_by))


class TabletGuardian(BaseModel):
    id: uuid.UUID
    display_name: str = Field(description="Prénom et initiale du nom")
    relationship: Relationship
    is_authorized_pickup: bool = Field(description="Seuls ces responsables peuvent emmener l'enfant")

    @classmethod
    def of(cls, guardian: Guardian, relationship: Relationship, authorized: bool) -> TabletGuardian:
        return cls(id=guardian.id, display_name=_short(guardian), relationship=relationship,
                   is_authorized_pickup=authorized)


class TabletChild(BaseModel):
    """Enfant attendu aujourd'hui, avec son état et les personnes qui peuvent l'amener ou le chercher."""

    id: uuid.UUID
    first_name: str
    last_name: str
    presence: Literal["absent", "present", "left"] = Field(description="absent : pas encore arrivé ; present : "
                                                                       "arrivé ; left : reparti")
    arrived_at: datetime | None
    departed_at: datetime | None
    guardians: list[TabletGuardian]


class ArrivalIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"dropped_off_by": None}]})

    dropped_off_by: uuid.UUID | None = Field(default=None, description="Responsable qui dépose l'enfant, s'il est "
                                                                       "enregistré (facultatif)")


class DepartureIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"picked_up_by": "3fa85f64-5717-4562-b3fc-2c963f66afa6"}]})

    # Obligatoire : un enfant ne part qu'avec un responsable autorisé pour lui.
    picked_up_by: uuid.UUID = Field(description="Responsable de l'enfant, autorisé à venir le chercher")
