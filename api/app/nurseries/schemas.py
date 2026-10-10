import uuid

from pydantic import BaseModel, ConfigDict, Field


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
    capacity: int
    is_active: bool


class NurseryCreate(BaseModel):
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
    is_active: bool
    # Faux tant que l'employé invité n'a pas choisi son mot de passe (LUN-55).
    has_password: bool


class EmployeeOut(StaffOut):
    nursery_ids: list[uuid.UUID]
