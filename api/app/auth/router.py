"""Routes de l'authentification : /api/v2/auth/*."""

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.auth import service
from app.auth.dependencies import ClientDep, CurrentUser, NowDep, RepositoryDep, cookie_name
from app.auth.schemas import LoginIn, UserOut
from app.config import get_settings

router = APIRouter(prefix="/api/v2/auth", tags=["authentification"])

_ERRORS = {
    status.HTTP_401_UNAUTHORIZED: {"description": "Identifiants invalides ou session absente"},
    status.HTTP_429_TOO_MANY_REQUESTS: {"description": "Trop de tentatives (en-tête Retry-After)"},
}


def _no_store(response: Response) -> None:
    # Réponses liées à une identité : ni le navigateur ni un proxy ne les gardent.
    response.headers["Cache-Control"] = "no-store"


@router.post("/login", responses=_ERRORS)
async def login(body: LoginIn, request: Request, response: Response, repo: RepositoryDep,
                client: ClientDep, now: NowDep) -> UserOut:
    """Ouvre une session et pose le cookie de session."""
    try:
        result = await service.login(repo, body.email, body.password, client, now,
                                     previous_token=request.cookies.get(cookie_name()))
    except service.InvalidCredentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Identifiants invalides") from None
    except service.TooManyAttempts as exc:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de tentatives, réessayez plus tard",
                            headers={"Retry-After": str(exc.retry_after)}) from None
    # Pas de Max-Age : cookie de session du navigateur, effacé à sa fermeture.
    # Les expirations (30 min d'inactivité, 12 h au plus) sont tenues côté serveur.
    response.set_cookie(cookie_name(), result.token, httponly=True, secure=get_settings().cookie_secure,
                        samesite="lax", path="/")
    _no_store(response)
    return UserOut.model_validate(result.user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response, repo: RepositoryDep, client: ClientDep,
                 now: NowDep) -> None:
    """Supprime la session en base et efface le cookie. Sans session, ne fait rien."""
    token = request.cookies.get(cookie_name())
    if token:
        await service.logout(repo, token, client, now)
    response.delete_cookie(cookie_name(), httponly=True, secure=get_settings().cookie_secure,
                           samesite="lax", path="/")


@router.get("/me", responses={status.HTTP_401_UNAUTHORIZED: _ERRORS[status.HTTP_401_UNAUTHORIZED]})
async def me(user: CurrentUser, response: Response) -> UserOut:
    """Utilisateur de la session en cours."""
    _no_store(response)
    return UserOut.model_validate(user)
