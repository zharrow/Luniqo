from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.auth.passwords import MAX_LENGTH
from app.nurseries.schemas import StaffOut

Name = Annotated[str, Field(min_length=1, max_length=100)]


class EmployeeCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"email": "camille.martin@example.com", "first_name": "Camille", "last_name": "Martin"}]})

    email: str = Field(min_length=3, max_length=254)
    first_name: Name
    last_name: Name


class EmployeeUpdate(BaseModel):
    """Champs absents : inchangés. `is_active: false` = départ du salarié, sessions fermées sur-le-champ."""

    model_config = ConfigDict(json_schema_extra={"examples": [{"last_name": "Martin-Durand"}, {"is_active": False}]})

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = None


class StaffInvitationOut(BaseModel):
    """Le jeton n'est montré qu'une fois. Tant qu'il n'y a pas d'envoi d'e-mails (LUN-59), la direction le transmet."""

    employee: StaffOut
    token: str = Field(description="Jeton du lien d'invitation, à usage unique")
    expires_at: datetime = Field(description="7 jours après la création")


class TokenIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"token": "jeton-recu-dans-le-lien-d-invitation"}]})

    # Dans le corps de la requête, jamais dans l'URL : il n'apparaît pas dans les journaux de la passerelle.
    token: str = Field(min_length=20, max_length=100)


class StaffInvitationInfo(BaseModel):
    first_name: str
    enterprise_name: str
    email: str


class AcceptIn(TokenIn):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"token": "jeton-recu-dans-le-lien-d-invitation", "password": "mot de passe choisi, 15 caractères au moins"}]})

    password: str = Field(min_length=1, max_length=MAX_LENGTH, description="15 caractères au moins, ni courant ni "
                                                                           "prévisible")


class AcceptedOut(BaseModel):
    email: str


class PasswordChangeIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"current_password": "ancien mot de passe", "new_password": "nouveau mot de passe, 15 caractères au moins"}]})

    current_password: str = Field(min_length=1, max_length=MAX_LENGTH)
    new_password: str = Field(min_length=1, max_length=MAX_LENGTH)


class PasswordChangedOut(BaseModel):
    other_sessions_closed: int = Field(description="Sessions fermées sur les autres appareils, tablette comprise")
