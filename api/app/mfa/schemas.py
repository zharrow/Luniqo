from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.mfa.policy import MfaState


class CodeIn(BaseModel):
    # Code TOTP (6 chiffres) ou code de secours (XXXX-XXXX-XXXX), espaces et tirets tolérés.
    code: str = Field(min_length=1, max_length=32)


class TotpOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    confirmed_at: datetime
    last_used_at: datetime | None


class MfaStatusOut(BaseModel):
    state: MfaState
    totp: TotpOut | None
    totp_setup_pending: bool
    backup_codes_remaining: int


class TotpSetupOut(BaseModel):
    """Secret à saisir dans l'application d'authentification, ou URI à afficher en QR code.

    Renvoyé une seule fois : il n'est plus lisible ensuite, même par la direction.
    """

    secret: str
    otpauth_uri: str


class TotpConfirmOut(BaseModel):
    # Codes de secours créés avec le premier facteur ; null si le compte en avait déjà.
    backup_codes: list[str] | None


class BackupCodesOut(BaseModel):
    backup_codes: list[str]
