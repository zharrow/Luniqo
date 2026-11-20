import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.nurseries.policy import Milestone


class NurseryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    enterprise_id: uuid.UUID
    name: str
    address: str | None
    postal_code: str | None
    city: str
    phone: str | None
    email: str | None
    capacity: int = Field(description="Nombre d'enfants accueillis simultanément au plus")
    is_active: bool = Field(description="Faux : crèche fermée, ses tablettes ne fonctionnent plus")


class NurserySummary(BaseModel):
    children: int = Field(ge=0, description="Enfants aux statuts active ou adaptation (CAN_ATTEND)")
    present: int = Field(ge=0, description="Enfants arrivés sans départ aujourd'hui, en heure de Paris")
    staff: int = Field(ge=0, description="Employés actifs ayant un accès à la crèche")


class OnboardingStepOut(BaseModel):
    milestone: Milestone = Field(description="staff : un employé actif a accès ; tablet : une tablette ni révoquée ni "
                                             "expirée ; first_attendance : une présence enregistrée")
    achieved: bool
    achieved_at: datetime | None = Field(description="Plus ancienne preuve encore valable ; null si non obtenu")


class NurseryOnboarding(BaseModel):
    """Mise en route de la crèche : un succès par étape, recalculé à chaque lecture (LUN-128)."""

    model_config = ConfigDict(json_schema_extra={"examples": [{"steps": [
        {"milestone": "staff", "achieved": True, "achieved_at": "2026-11-03T09:00:00Z"},
        {"milestone": "tablet", "achieved": True, "achieved_at": "2026-11-04T08:30:00Z"},
        {"milestone": "first_attendance", "achieved": False, "achieved_at": None}]}]})

    steps: list[OnboardingStepOut] = Field(description="Une étape par succès, toujours dans le même ordre")


class NurseryCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"name": "Les Petits Pas", "address": "1 rue de l'Exemple", "postal_code": "31000", "city": "Toulouse",
         "phone": "0500000000", "email": "contact@example.com", "capacity": 12}]})

    name: str = Field(min_length=1, max_length=255)
    address: str | None = Field(default=None, max_length=255)
    postal_code: str | None = Field(default=None, max_length=10)
    city: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=254)
    # Une micro-crèche accueille au plus 12 enfants ; 1 000 borne les erreurs de saisie.
    capacity: int = Field(gt=0, le=1000)


class NurseryUpdate(BaseModel):
    """Champs absents : inchangés. Une crèche se désactive, elle ne se supprime pas."""

    model_config = ConfigDict(json_schema_extra={"examples": [{"capacity": 10}, {"is_active": False}]})

    name: str | None = Field(default=None, min_length=1, max_length=255)
    address: str | None = Field(default=None, max_length=255)
    postal_code: str | None = Field(default=None, max_length=10)
    city: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=254)
    capacity: int | None = Field(default=None, gt=0, le=1000)
    is_active: bool | None = None


class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    is_active: bool = Field(description="Faux : salarié parti, il ne peut plus se connecter")
    has_password: bool = Field(description="Faux tant que l'employé invité n'a pas choisi son mot de passe")


class EmployeeOut(StaffOut):
    nursery_ids: list[uuid.UUID] = Field(description="Crèches auxquelles l'employé a accès")
