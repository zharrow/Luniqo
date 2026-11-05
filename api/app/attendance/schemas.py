import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints

from app.attendance.models import AttendanceCorrection, CorrectionKind
from app.attendance.service import Presence
from app.attendance.service import short_name as _short
from app.children.models import Guardian, Relationship


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
    corrected: bool = Field(description="Présence ajoutée ou corrigée par la direction (journal des corrections)")

    @classmethod
    def of(cls, presence: Presence) -> AttendanceOut:
        attendance, child = presence.attendance, presence.child
        return cls(id=attendance.id, child_id=child.id, child_name=f"{child.first_name} {child.last_name}",
                   day=attendance.day, arrived_at=attendance.arrived_at, arrival_by=_short(presence.arrival_by),
                   dropped_off_by=_short(presence.dropped_off_by), departed_at=attendance.departed_at,
                   departure_by=_short(presence.departure_by), picked_up_by=_short(presence.picked_up_by),
                   corrected=presence.corrected)


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


# --- Corrections par la direction (LUN-120) ------------------------------------

# Motif obligatoire : il dit pourquoi un pointage a changé (contrôle, facturation, litige avec une famille).
Reason = Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=500)]
_REASON = Field(description="Motif de la correction, 5 à 500 caractères (gardé dans le journal)")


class PresenceCreate(BaseModel):
    """Présence oubliée sur la tablette. Sans départ, seulement pour un enfant encore là aujourd'hui."""

    model_config = ConfigDict(extra="forbid", json_schema_extra={"examples": [{
        "child_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "arrived_at": "2026-07-15T08:30:00+02:00",
        "departed_at": "2026-07-15T17:45:00+02:00", "reason": "Arrivée et départ oubliés sur la tablette"}]})

    child_id: uuid.UUID
    arrived_at: AwareDatetime = Field(description="Heure d'arrivée, avec son fuseau ; fixe le jour (à Paris)")
    departed_at: AwareDatetime | None = Field(default=None, description="Heure de départ, le même jour")
    dropped_off_by: uuid.UUID | None = Field(default=None, description="Responsable qui a amené l'enfant")
    picked_up_by: uuid.UUID | None = Field(default=None, description="Responsable venu chercher l'enfant, autorisé "
                                                                     "pour lui (facultatif)")
    reason: Reason = _REASON


class PresenceUpdate(BaseModel):
    """Seuls les champs envoyés changent. `departed_at` à null rouvre la présence (le jour même seulement)."""

    model_config = ConfigDict(extra="forbid", json_schema_extra={"examples": [{
        "departed_at": "2026-07-15T17:45:00+02:00", "reason": "Départ oublié sur la tablette"}]})

    arrived_at: AwareDatetime | None = Field(default=None, description="Nouvelle heure d'arrivée, le même jour")
    departed_at: AwareDatetime | None = Field(default=None, description="Nouvelle heure de départ, ou null")
    dropped_off_by: uuid.UUID | None = Field(default=None, description="Responsable qui a amené l'enfant, ou null")
    picked_up_by: uuid.UUID | None = Field(default=None, description="Responsable venu chercher l'enfant, autorisé "
                                                                     "pour lui, ou null")
    reason: Reason = _REASON

    def changes(self) -> dict:
        return {field: getattr(self, field) for field in self.model_fields_set - {"reason"}}


class PresenceCancel(BaseModel):
    model_config = ConfigDict(extra="forbid", json_schema_extra={"examples": [
        {"reason": "Pointée sur Léo au lieu d'Emma"}]})

    reason: Reason = _REASON


class PresenceValues(BaseModel):
    arrived_at: datetime
    departed_at: datetime | None
    dropped_off_by: str | None
    picked_up_by: str | None


class CorrectionOut(BaseModel):
    id: uuid.UUID
    attendance_id: uuid.UUID | None = Field(description="Null si la présence a été annulée")
    child_id: uuid.UUID
    child_name: str
    day: date = Field(description="Jour de la présence corrigée, à Paris")
    kind: CorrectionKind = Field(description="created : présence ajoutée ; modified : corrigée ; cancelled : "
                                             "retirée (pointée par erreur)")
    reason: str
    corrected_at: datetime
    corrected_by: str = Field(description="Membre de la direction qui a corrigé (nom complet)")
    before: PresenceValues | None = Field(description="Null pour une présence ajoutée")
    after: PresenceValues | None = Field(description="Null pour une présence annulée")

    @classmethod
    def of(cls, entry: AttendanceCorrection) -> CorrectionOut:
        def values(prefix: str) -> PresenceValues | None:
            arrived = getattr(entry, f"{prefix}_arrived_at")
            if arrived is None:
                return None
            return PresenceValues(arrived_at=arrived, departed_at=getattr(entry, f"{prefix}_departed_at"),
                                  dropped_off_by=getattr(entry, f"{prefix}_dropped_off_by"),
                                  picked_up_by=getattr(entry, f"{prefix}_picked_up_by"))

        return cls(id=entry.id, attendance_id=entry.attendance_id, child_id=entry.child_id,
                   child_name=entry.child_name, day=entry.day, kind=entry.kind, reason=entry.reason,
                   corrected_at=entry.corrected_at, corrected_by=entry.corrected_by_name,
                   before=values("old"), after=values("new"))
