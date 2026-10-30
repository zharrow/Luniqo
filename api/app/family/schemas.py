import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.auth.passwords import MAX_LENGTH
from app.children.models import ChildStatus, Relationship


class InvitationOut(BaseModel):
    """Le jeton n'est montré qu'une fois. Tant qu'il n'y a pas d'envoi d'e-mails, la direction le transmet."""

    token: str = Field(description="Jeton du lien d'invitation, à usage unique")
    email: str = Field(description="Adresse du futur compte famille")
    expires_at: datetime = Field(description="7 jours après la création")


class TokenIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"token": "jeton-recu-dans-le-lien-d-invitation"}]})

    # Dans le corps de la requête, jamais dans l'URL : il n'apparaît pas dans les journaux de la passerelle.
    token: str = Field(min_length=20, max_length=100)


class InvitationInfo(BaseModel):
    first_name: str
    nursery_name: str
    email: str
    account_exists: bool = Field(description="Un compte famille existe déjà avec cette adresse : son mot de passe "
                                             "sera demandé au lieu d'en choisir un")


class AcceptIn(TokenIn):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"token": "jeton-recu-dans-le-lien-d-invitation", "password": "mot de passe choisi, 15 caractères au moins"}]})

    password: str = Field(min_length=1, max_length=MAX_LENGTH, description="Mot de passe choisi, ou celui du "
                                                                           "compte famille existant")


class AcceptedOut(BaseModel):
    email: str
    account_created: bool = Field(description="Faux : l'invitation a été reliée à un compte famille existant")


class PresenceOut(BaseModel):
    day: date
    arrived_at: datetime
    departed_at: datetime | None
    picked_up_by: str | None


class FamilyChild(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    nursery_name: str
    status: ChildStatus
    today: Literal["absent", "present", "left"] = Field(description="Présence du jour, à Paris")
    today_arrived_at: datetime | None
    today_departed_at: datetime | None


class FamilyContact(BaseModel):
    """Responsables de l'enfant, sans leurs coordonnées : un parent ne reçoit pas le téléphone des autres."""

    display_name: str
    relationship: Relationship
    has_parental_authority: bool
    is_authorized_pickup: bool


class FamilyChildDetail(FamilyChild):
    birth_date: date
    contacts: list[FamilyContact]
    presences: list[PresenceOut] = Field(description="Présences des `days` derniers jours, les plus récentes d'abord")
