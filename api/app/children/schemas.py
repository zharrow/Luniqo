import uuid
from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.children.models import ChildStatus, Relationship

Name = Annotated[str, Field(min_length=1, max_length=100)]


class FamilyCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"label": "Famille Martin", "address": "1 rue de l'Exemple", "postal_code": "31000", "city": "Toulouse"}]})

    label: str = Field(min_length=1, max_length=255, description="Nom affiché de la famille")
    address: str | None = Field(default=None, max_length=255)
    postal_code: str | None = Field(default=None, max_length=10)
    city: str | None = Field(default=None, max_length=100)


class FamilyUpdate(BaseModel):
    """Champs absents : inchangés. Une famille se désactive, elle ne se supprime pas."""

    model_config = ConfigDict(json_schema_extra={"examples": [{"city": "Escalquens"}]})

    label: str | None = Field(default=None, min_length=1, max_length=255)
    address: str | None = Field(default=None, max_length=255)
    postal_code: str | None = Field(default=None, max_length=10)
    city: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None


class FamilyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nursery_id: uuid.UUID
    label: str
    address: str | None
    postal_code: str | None
    city: str | None
    is_active: bool


class ChildCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"first_name": "Léa", "last_name": "Martin", "birth_date": "2025-03-14", "enrollment_date": "2026-09-01"}]})

    first_name: Name
    last_name: Name
    birth_date: date
    enrollment_date: date = Field(description="Premier jour d'accueil ; pas avant la naissance")
    status: ChildStatus = Field(default=ChildStatus.ADAPTATION, description="adaptation, active ou suspended ; "
                                                                            "departed se déclare ensuite")

    @model_validator(mode="after")
    def dates_coherentes(self) -> ChildCreate:
        if self.enrollment_date < self.birth_date:
            raise ValueError("La date d'entrée ne peut pas précéder la naissance")
        if self.status == ChildStatus.DEPARTED:
            raise ValueError("Un enfant se crée inscrit ; le départ se déclare ensuite avec sa date")
        return self


class ChildUpdate(BaseModel):
    """Champs absents : inchangés. Passer au statut « departed » exige `exit_date`."""

    model_config = ConfigDict(json_schema_extra={"examples": [
        {"status": "active"}, {"status": "departed", "exit_date": "2027-07-30"}]})

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    birth_date: date | None = None
    enrollment_date: date | None = None
    status: ChildStatus | None = None
    exit_date: date | None = None


class ChildOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    family_id: uuid.UUID
    nursery_id: uuid.UUID
    first_name: str
    last_name: str
    birth_date: date
    status: ChildStatus
    enrollment_date: date
    exit_date: date | None = Field(description="Dernier jour d'accueil, pour un enfant parti")


class GuardianCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"first_name": "Camille", "last_name": "Martin", "email": "camille.martin@example.com",
         "phone": "0600000000"}]})

    first_name: Name
    last_name: Name
    email: str | None = Field(default=None, min_length=3, max_length=254)
    phone: str | None = Field(default=None, max_length=20)

    @field_validator("email")
    @classmethod
    def normaliser_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip().lower()
        if "@" not in value:
            raise ValueError("Adresse e-mail invalide")
        return value


class GuardianUpdate(GuardianCreate):
    model_config = ConfigDict(json_schema_extra={"examples": [{"phone": "0611111111"}]})

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = None


class GuardianOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    family_id: uuid.UUID
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    has_account: bool = Field(description="Le responsable a un compte famille (invitation acceptée)")
    is_active: bool


class LinkIn(BaseModel):
    """Lien complet (PUT) : les autorisations absentes valent faux."""

    model_config = ConfigDict(json_schema_extra={"examples": [
        {"relationship": "parent", "has_parental_authority": True, "is_authorized_pickup": True,
         "is_emergency_contact": True}]})

    relationship: Relationship
    has_parental_authority: bool = Field(default=False, description="Ouvre la consultation de l'enfant dans "
                                                                    "l'espace famille")
    is_authorized_pickup: bool = Field(default=False, description="Peut venir chercher l'enfant : sans elle, le "
                                                                  "départ est refusé")
    is_emergency_contact: bool = False


class ChildGuardianOut(BaseModel):
    guardian: GuardianOut
    relationship: Relationship
    has_parental_authority: bool
    is_authorized_pickup: bool
    is_emergency_contact: bool


class ChildDetail(ChildOut):
    guardians: list[ChildGuardianOut]


class FamilyDetail(FamilyOut):
    children: list[ChildOut]
    guardians: list[GuardianOut]
