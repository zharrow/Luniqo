"""Routes du second facteur : /api/v2/auth/mfa/* (ADR-004).

Elles déclarent `CurrentWebSession` : une session en attente du second
facteur peut les appeler (c'est leur raison d'être), les règles de chaque cas
étant vérifiées par le service.
"""

from fastapi import APIRouter, HTTPException, Response, status

from app.auth.dependencies import ClientDep, CurrentWebSession, NowDep
from app.auth.router import no_store, session_out
from app.auth.schemas import SessionOut
from app.config import get_settings
from app.db import SessionDep
from app.mfa import service
from app.mfa.crypto import SecretUnreadable
from app.mfa.schemas import BackupCodesOut, CodeIn, MfaStatusOut, TotpConfirmOut, TotpOut, TotpSetupOut

router = APIRouter(prefix="/api/v2/auth/mfa", tags=["second facteur"])

_REFUSALS = {
    "mfa_pending": (status.HTTP_403_FORBIDDEN, "Présentez d'abord votre second facteur"),
    "reauthentication_required": (status.HTTP_403_FORBIDDEN,
                                  "Reconnectez-vous pour modifier vos facteurs (connexion de plus de 15 minutes)"),
    "totp_locked": (status.HTTP_403_FORBIDDEN, "Application d'authentification bloquée après trop d'échecs : "
                                               "utilisez un code de secours"),
    "no_factor": (status.HTTP_404_NOT_FOUND, "Aucune application d'authentification active"),
    "not_pending": (status.HTTP_409_CONFLICT, "Aucun second facteur attendu pour cette session"),
    "no_pending_setup": (status.HTTP_409_CONFLICT, "Aucune activation en cours"),
    "last_factor": (status.HTTP_409_CONFLICT,
                    "Second facteur obligatoire pour ce rôle : remplacez-le au lieu de le retirer"),
}

_ERRORS = {
    status.HTTP_401_UNAUTHORIZED: {"description": "Session absente ou code invalide"},
    status.HTTP_403_FORBIDDEN: {"description": "Second facteur à présenter d'abord, réauthentification requise "
                                               "ou TOTP bloqué"},
    status.HTTP_409_CONFLICT: {"description": "Opération sans objet dans l'état actuel"},
    status.HTTP_429_TOO_MANY_REQUESTS: {"description": "Trop de tentatives (en-tête Retry-After)"},
    status.HTTP_503_SERVICE_UNAVAILABLE: {"description": "Clé de chiffrement absente ou différente"},
}


def _http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, service.Refused):
        code, message = _REFUSALS[exc.reason]
        return HTTPException(code, message)
    if isinstance(exc, service.InvalidCode):
        return HTTPException(status.HTTP_401_UNAUTHORIZED, "Code invalide")
    if isinstance(exc, service.TooManyAttempts):
        return HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de tentatives, réessayez plus tard",
                             headers={"Retry-After": str(exc.retry_after)})
    # MfaUnavailable, SecretUnreadable : configuration du serveur, pas une erreur de la personne.
    return HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Second facteur momentanément indisponible")


_HANDLED = (service.Refused, service.InvalidCode, service.TooManyAttempts, service.MfaUnavailable, SecretUnreadable)


@router.get("", responses=_ERRORS)
async def get_status(web: CurrentWebSession, db: SessionDep, response: Response) -> MfaStatusOut:
    """État du second facteur du compte et de la session."""
    no_store(response)
    result = await service.status(db, web)
    return MfaStatusOut(state=result.state, totp=TotpOut.model_validate(result.totp) if result.totp else None,
                        totp_setup_pending=result.totp_setup_pending,
                        backup_codes_remaining=result.backup_codes_remaining)


@router.post("/totp", status_code=status.HTTP_201_CREATED, responses=_ERRORS)
async def start_totp(web: CurrentWebSession, db: SessionDep, now: NowDep, response: Response) -> TotpSetupOut:
    """Commence l'activation d'une application d'authentification (ou son remplacement)."""
    no_store(response)
    try:
        secret, uri = await service.start_totp(db, web, get_settings().mfa_key, now)
    except _HANDLED as exc:
        raise _http_error(exc) from None
    return TotpSetupOut(secret=secret, otpauth_uri=uri)


@router.post("/totp/confirm", responses=_ERRORS)
async def confirm_totp(body: CodeIn, web: CurrentWebSession, db: SessionDep, client: ClientDep, now: NowDep,
                       response: Response) -> TotpConfirmOut:
    """Active l'application d'authentification avec un premier code. Ferme les autres sessions du compte."""
    no_store(response)
    try:
        codes = await service.confirm_totp(db, web, body.code, get_settings().mfa_key, client, now)
    except _HANDLED as exc:
        raise _http_error(exc) from None
    return TotpConfirmOut(backup_codes=codes)


@router.delete("/totp", status_code=status.HTTP_204_NO_CONTENT, responses=_ERRORS)
async def remove_totp(web: CurrentWebSession, db: SessionDep, client: ClientDep, now: NowDep) -> None:
    """Retire l'application d'authentification (comptes où le second facteur est facultatif)."""
    try:
        await service.remove_totp(db, web, client, now)
    except _HANDLED as exc:
        raise _http_error(exc) from None


@router.post("/verify", responses=_ERRORS)
async def verify(body: CodeIn, web: CurrentWebSession, db: SessionDep, client: ClientDep, now: NowDep,
                 response: Response) -> SessionOut:
    """Présente le second facteur (code TOTP ou code de secours) : la session devient complète."""
    no_store(response)
    try:
        await service.verify(db, web, body.code, get_settings().mfa_key, client, now)
    except _HANDLED as exc:
        raise _http_error(exc) from None
    return session_out(web.user, web.session, has_factor=True)


@router.post("/backup-codes", responses=_ERRORS)
async def regenerate_backup_codes(web: CurrentWebSession, db: SessionDep, client: ClientDep, now: NowDep,
                                  response: Response) -> BackupCodesOut:
    """Crée 10 nouveaux codes de secours ; les anciens ne valent plus rien."""
    no_store(response)
    try:
        codes = await service.regenerate_backup_codes(db, web, client, now)
    except _HANDLED as exc:
        raise _http_error(exc) from None
    return BackupCodesOut(backup_codes=codes)
