import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.auth.models import AppUser
from app.auth.passwords import MAX_LENGTH


class TabletCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"label": "Tablette de l'entrée"}]})

    label: str = Field(min_length=1, max_length=100, description="Ex. « Tablette de l'entrée »")


class TabletOut(BaseModel):
    """Tablette enrôlée. Le jeton d'appareil n'est jamais renvoyé : il est posé en cookie sur la tablette."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nursery_id: uuid.UUID
    label: str
    created_at: datetime
    expires_at: datetime = Field(description="Fin de l'enrôlement (90 jours) : la direction enrôle à nouveau")
    revoked_at: datetime | None
    last_seen_at: datetime | None = Field(description="Dernière requête reçue de la tablette")


class TabletStaffMember(BaseModel):
    """Employé affiché sur la tablette : prénom et initiale seulement."""

    id: uuid.UUID
    display_name: str = Field(description="Prénom et initiale du nom, ex. « Camille M. »")
    pin_set: bool = Field(description="L'employé a choisi son PIN")
    pin_locked: bool = Field(description="PIN bloqué après 3 erreurs ; la direction le débloque")

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
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "pin": "4826"}]})

    user_id: uuid.UUID = Field(description="Employé choisi dans la liste de `GET /tablet`")
    pin: str = Field(min_length=1, max_length=16)


class TabletActorOut(BaseModel):
    user_id: uuid.UUID
    display_name: str
    nursery_id: uuid.UUID
    nursery_name: str
    expires_at: datetime = Field(description="Fin de la session d'action (2 minutes après le PIN)")


class PinIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"pin": "4826", "password": "mot de passe de démonstration"}]})

    pin: str = Field(min_length=1, max_length=16, description="4 chiffres, ni identiques ni en suite")
    password: str = Field(min_length=1, max_length=MAX_LENGTH, description="Mot de passe actuel, pour confirmer")


def display_name(user: AppUser) -> str:
    return f"{user.first_name} {user.last_name[:1]}." if user.last_name else user.first_name
