from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.mfa.policy import MfaState


class CodeIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"code": "123456"}]})

    code: str = Field(min_length=1, max_length=32, description="Code TOTP (6 chiffres) ou code de secours "
                                                               "(XXXX-XXXX-XXXX) ; espaces et tirets tolérés")


class TotpOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    confirmed_at: datetime
    last_used_at: datetime | None


class MfaStatusOut(BaseModel):
    state: MfaState = Field(description="État du second facteur pour la session en cours")
    totp: TotpOut | None = Field(description="Application d'authentification active ; null s'il n'y en a pas")
    totp_setup_pending: bool = Field(description="Une activation est commencée et attend son premier code")
    backup_codes_remaining: int = Field(description="Codes de secours encore utilisables")


class TotpSetupOut(BaseModel):
    """Secret à saisir dans l'application d'authentification, ou URI à afficher en QR code.

    Renvoyé une seule fois : il n'est plus lisible ensuite, même par la direction.
    """

    secret: str = Field(description="Secret en base32, à saisir à la main")
    otpauth_uri: str = Field(description="URI otpauth:// à afficher en QR code")


class TotpConfirmOut(BaseModel):
    backup_codes: list[str] | None = Field(description="Codes de secours créés avec le premier facteur, montrés une "
                                                       "seule fois ; null si le compte en avait déjà")


class BackupCodesOut(BaseModel):
    backup_codes: list[str] = Field(description="10 codes à usage unique, montrés une seule fois")
