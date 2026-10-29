import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.passkeys.policy import NAME_MAX_LENGTH

# Réponse de navigator.credentials.create() ou .get(), sérialisée en JSON par
# le front (PublicKeyCredential.toJSON()). Vérifiée par py_webauthn, pas ici.
Credential = dict[str, Any]


class PasskeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    # Passkey sauvegardée ou synchronisée (trousseau iCloud, Google…).
    backed_up: bool
    created_at: datetime
    last_used_at: datetime | None


class PasskeyNameIn(BaseModel):
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH, examples=["iPhone de Camille"])


class RegistrationIn(BaseModel):
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH, examples=["iPhone de Camille"])
    credential: Credential


class RegistrationOut(BaseModel):
    passkey: PasskeyOut
    # Codes de secours créés avec le premier facteur du compte ; null s'il en avait déjà.
    backup_codes: list[str] | None


class AssertionIn(BaseModel):
    credential: Credential
