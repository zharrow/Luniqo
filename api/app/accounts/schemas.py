from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.auth.passwords import MAX_LENGTH
from app.nurseries.schemas import StaffOut

Name = Annotated[str, Field(min_length=1, max_length=100)]


class EmployeeCreate(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    first_name: Name
    last_name: Name


class EmployeeUpdate(BaseModel):
    """Champs absents : inchangés. `is_active: false` = départ du salarié, sessions fermées sur-le-champ."""

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = None


class StaffInvitationOut(BaseModel):
    """Le jeton n'est montré qu'une fois. Tant qu'il n'y a pas d'envoi d'e-mails (LUN-59), la direction le transmet."""

    employee: StaffOut
    token: str
    expires_at: datetime


class TokenIn(BaseModel):
    # Dans le corps de la requête, jamais dans l'URL : il n'apparaît pas dans les journaux de la passerelle.
    token: str = Field(min_length=20, max_length=100)


class StaffInvitationInfo(BaseModel):
    first_name: str
    enterprise_name: str
    email: str


class AcceptIn(TokenIn):
    password: str = Field(min_length=1, max_length=MAX_LENGTH)


class AcceptedOut(BaseModel):
    email: str


class PasswordChangeIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=MAX_LENGTH)
    new_password: str = Field(min_length=1, max_length=MAX_LENGTH)


class PasswordChangedOut(BaseModel):
    other_sessions_closed: int
