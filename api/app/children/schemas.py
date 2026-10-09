import uuid
from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.children.models import ChildStatus, Relationship

Name = Annotated[str, Field(min_length=1, max_length=100)]


class FamilyCreate(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    address: str | None = Field(default=None, max_length=255)
    postal_code: str | None = Field(default=None, max_length=10)
    city: str | None = Field(default=None, max_length=100)


class FamilyUpdate(BaseModel):
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
    first_name: Name
    last_name: Name
    birth_date: date
    enrollment_date: date
    status: ChildStatus = ChildStatus.ADAPTATION

    @model_validator(mode="after")
    def dates_coherentes(self) -> ChildCreate:
        if self.enrollment_date < self.birth_date:
            raise ValueError("La date d'entrée ne peut pas précéder la naissance")
        if self.status == ChildStatus.DEPARTED:
            raise ValueError("Un enfant se crée inscrit ; le départ se déclare ensuite avec sa date")
        return self


class ChildUpdate(BaseModel):
    """Champs absents : inchangés. Passer au statut « departed » exige `exit_date`."""

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
    exit_date: date | None


class GuardianCreate(BaseModel):
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
    has_account: bool
    is_active: bool


class LinkIn(BaseModel):
    relationship: Relationship
    has_parental_authority: bool = False
    is_authorized_pickup: bool = False
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
