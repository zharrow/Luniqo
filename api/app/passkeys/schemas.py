import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.passkeys.policy import NAME_MAX_LENGTH

# Réponse de navigator.credentials.create() ou .get(), sérialisée en JSON par
# le front (PublicKeyCredential.toJSON()). Vérifiée par py_webauthn, pas ici.
Credential = dict[str, Any]

# Exemples fictifs, abrégés : le navigateur produit ces objets, personne ne les écrit.
_REGISTRATION_CREDENTIAL = {
    "id": "q2v8Xk1yS3eWb0dT", "rawId": "q2v8Xk1yS3eWb0dT", "type": "public-key",
    "response": {"clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0", "attestationObject": "o2NmbXRkbm9uZQ",
                 "transports": ["internal", "hybrid"]},
    "authenticatorAttachment": "platform", "clientExtensionResults": {},
}
_ASSERTION_CREDENTIAL = {
    "id": "q2v8Xk1yS3eWb0dT", "rawId": "q2v8Xk1yS3eWb0dT", "type": "public-key",
    "response": {"clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0In0", "authenticatorData": "SZYN5YgOjGh0NBcP",
                 "signature": "MEUCIQDx2y4", "userHandle": "c2FyYWgtZGVtbw"},
    "authenticatorAttachment": "platform", "clientExtensionResults": {},
}
_CREDENTIAL_DESCRIPTION = "Réponse du navigateur, sérialisée par `PublicKeyCredential.toJSON()`"


class PasskeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str = Field(description="Nom choisi à l'enregistrement, pour la reconnaître dans la liste")
    backed_up: bool = Field(description="Passkey sauvegardée ou synchronisée (trousseau iCloud, Google…)")
    created_at: datetime
    last_used_at: datetime | None = Field(description="Dernière utilisation ; null si jamais utilisée")


class PasskeyNameIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"name": "iPhone de Camille"}]})

    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)


class RegistrationIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [
        {"name": "iPhone de Camille", "credential": _REGISTRATION_CREDENTIAL}]})

    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    credential: Credential = Field(description=f"{_CREDENTIAL_DESCRIPTION} après navigator.credentials.create()")


class RegistrationOut(BaseModel):
    passkey: PasskeyOut
    backup_codes: list[str] | None = Field(description="Codes de secours créés avec le premier facteur du compte, "
                                                       "montrés une seule fois ; null s'il en avait déjà")


class AssertionIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"credential": _ASSERTION_CREDENTIAL}]})

    credential: Credential = Field(description=f"{_CREDENTIAL_DESCRIPTION} après navigator.credentials.get()")
