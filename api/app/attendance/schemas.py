import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

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
    day: date
    arrived_at: datetime
    arrival_by: str | None
    dropped_off_by: str | None
    departed_at: datetime | None
    departure_by: str | None
    picked_up_by: str | None

    @classmethod
    def of(cls, presence: Presence) -> AttendanceOut:
        attendance, child = presence.attendance, presence.child
        return cls(id=attendance.id, child_id=child.id, child_name=f"{child.first_name} {child.last_name}",
                   day=attendance.day, arrived_at=attendance.arrived_at, arrival_by=_short(presence.arrival_by),
                   dropped_off_by=_short(presence.dropped_off_by), departed_at=attendance.departed_at,
                   departure_by=_short(presence.departure_by), picked_up_by=_short(presence.picked_up_by))


class TabletGuardian(BaseModel):
    id: uuid.UUID
    display_name: str
    relationship: Relationship
    is_authorized_pickup: bool

    @classmethod
    def of(cls, guardian: Guardian, relationship: Relationship, authorized: bool) -> TabletGuardian:
        return cls(id=guardian.id, display_name=_short(guardian), relationship=relationship,
                   is_authorized_pickup=authorized)


class TabletChild(BaseModel):
    """Enfant attendu aujourd'hui, avec son état et les personnes qui peuvent l'amener ou le chercher."""

    id: uuid.UUID
    first_name: str
    last_name: str
    presence: Literal["absent", "present", "left"]
    arrived_at: datetime | None
    departed_at: datetime | None
    guardians: list[TabletGuardian]


class ArrivalIn(BaseModel):
    # Responsable qui dépose l'enfant, s'il est enregistré (facultatif : on note qui l'a amené).
    dropped_off_by: uuid.UUID | None = None


class DepartureIn(BaseModel):
    # Obligatoire : un enfant ne part qu'avec un responsable autorisé pour lui.
    picked_up_by: uuid.UUID
