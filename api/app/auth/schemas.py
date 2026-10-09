import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.auth.models import UserRole
from app.auth.passwords import MAX_LENGTH


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    # Bornée pour qu'un client ne fasse pas hacher des mégaoctets.
    password: str = Field(min_length=1, max_length=MAX_LENGTH)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    role: UserRole
    enterprise_id: uuid.UUID | None
