import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.auth.models import AppUser
from app.auth.passwords import MAX_LENGTH


class TabletCreate(BaseModel):
    label: str = Field(min_length=1, max_length=100, description="Ex. « Tablette de l'entrée »")


class TabletOut(BaseModel):
    """Tablette enrôlée. Le jeton d'appareil n'est jamais renvoyé : il est posé en cookie sur la tablette."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nursery_id: uuid.UUID
    label: str
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None
    last_seen_at: datetime | None


class TabletStaffMember(BaseModel):
    """Employé affiché sur la tablette : prénom et initiale seulement."""

    id: uuid.UUID
    display_name: str
    pin_set: bool
    pin_locked: bool

    @classmethod
    def of(cls, user: AppUser) -> TabletStaffMember:
        return cls(id=user.id, display_name=display_name(user), pin_set=user.pin_hash is not None,
                   pin_locked=user.pin_locked_at is not None)


class TabletInfo(BaseModel):
    tablet_id: uuid.UUID
    label: str
    nursery_id: uuid.UUID
    nursery_name: str
    staff: list[TabletStaffMember]


class TabletLoginIn(BaseModel):
    user_id: uuid.UUID
    pin: str = Field(min_length=1, max_length=16)


class TabletActorOut(BaseModel):
    user_id: uuid.UUID
    display_name: str
    nursery_id: uuid.UUID
    nursery_name: str
    expires_at: datetime


class PinIn(BaseModel):
    pin: str = Field(min_length=1, max_length=16)
    password: str = Field(min_length=1, max_length=MAX_LENGTH, description="Mot de passe actuel, pour confirmer")


def display_name(user: AppUser) -> str:
    return f"{user.first_name} {user.last_name[:1]}." if user.last_name else user.first_name
