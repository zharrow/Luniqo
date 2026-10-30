"""Schéma OpenAPI : ce que Swagger (/api/docs) montre en plus de ce que FastAPI déduit seul.

- Les erreurs se déclarent à côté de l'endroit où elles sont levées :
  `raises(...)` sur une dépendance, `error_responses(...)` sur une route.
  `complete_schema` reporte celles des dépendances sur chaque route qui les
  déclare : une route protégée documente son 401 sans qu'on y pense.
- Les cookies d'authentification deviennent des schémas de sécurité, eux
  aussi déduits des dépendances de chaque route.
- Toute erreur documentée a le corps des erreurs de FastAPI, `{"detail": "…"}`
  (schéma `Error`), avec un exemple par message possible.
"""

import copy
import re
from collections.abc import Callable, Iterable, Iterator
from typing import Any

from fastapi import FastAPI
from fastapi.dependencies.models import Dependant
from fastapi.openapi.utils import get_openapi, validation_error_definition, validation_error_response_definition
from fastapi.routing import APIRoute, RouteContext, iter_route_contexts
from pydantic import BaseModel, Field

ErrorSpec = tuple[int, str]

UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})

DESCRIPTION = """\
API de la v2 de Luniqo, logiciel de gestion de crèches.

## Authentification

Trois cookies `HttpOnly`, posés par l'API ; le navigateur les renvoie seul.
Hors développement local, leur nom porte le préfixe `__Host-`.

| Cookie | Posé par | Ouvre |
|---|---|---|
| `luniqo_session` | `POST /api/v2/auth/login` | l'espace web (direction, employés, familles) |
| `luniqo_device` | `POST /api/v2/nurseries/{id}/tablets` | les routes `/api/v2/tablet` (tablette enrôlée, 90 jours) |
| `luniqo_tablet` | `POST /api/v2/tablet/session` (PIN) | les gestes de terrain, pendant 2 minutes |

Pour essayer une route protégée dans cette page : appeler `POST /api/v2/auth/login`,
puis, si la réponse indique `mfa: required`, `POST /api/v2/auth/mfa/verify`.
Le bouton « Authorize » est inutile : le cookie est déjà posé.

La direction et l'éditeur doivent présenter un second facteur (TOTP ou code de
secours) : tant que ce n'est pas fait, les routes répondent 403 « Second facteur
requis », sauf `/auth/me`, la déconnexion et `/auth/mfa`.

## Protection contre les requêtes intersites

Les requêtes `POST`, `PUT`, `PATCH` et `DELETE` doivent porter un en-tête
`Origin` égal à l'origine de Luniqo, sinon : 403 « Origine de la requête refusée ».
Les navigateurs l'envoient d'eux-mêmes ; avec `curl`, ajouter `-H 'Origin: http://localhost:8080'`.

## Conventions

- Erreurs : `{"detail": "message en français"}`, affichable tel quel. Une erreur
  de validation du corps ou des paramètres (422) suit le format de FastAPI.
- Un objet d'une autre crèche ou d'une autre entreprise répond **404**, comme un
  objet inexistant : l'API ne révèle pas qu'il existe.
- Dates `AAAA-MM-JJ`, horodatages ISO 8601 en UTC. Le « jour » (pointage,
  fiche de ménage) est celui de Paris.
- Rien ne se supprime : crèches, enfants, pièces, tâches et comptes se désactivent
  (`is_active: false`) pour garder l'historique.
"""

TAGS: list[dict[str, str]] = [
    {"name": "authentification", "description": "Connexion, session, mot de passe et PIN de l'employé."},
    {"name": "second facteur", "description": "Application d'authentification (TOTP) et codes de secours (ADR-004)."},
    {"name": "passkeys", "description": "Passkeys (Face ID, Touch ID, Windows Hello…) : second facteur ou connexion "
                                        "sans mot de passe (ADR-004). Chaque cérémonie se fait en deux appels, "
                                        "`…/options` puis la réponse du navigateur."},
    {"name": "crèches", "description": "Crèches de l'entreprise et accès des employés à chacune."},
    {"name": "personnel", "description": "Comptes des employés : invitation, départ, déblocage du PIN."},
    {"name": "tablettes", "description": "Enrôlement des tablettes et sessions d'action par PIN."},
    {"name": "enfants et familles", "description": "Familles, enfants, responsables et leurs autorisations."},
    {"name": "pointage", "description": "Arrivées et départs pointés sur la tablette, suivi des présences."},
    {"name": "ménage", "description": "Pièces, catalogue des tâches, fiche du jour, coches et historique."},
    {"name": "espace famille", "description": "Invitation des parents et consultation de leurs enfants."},
    {"name": "supervision", "description": "Sondes de l'exploitation."},
]


class Error(BaseModel):
    """Corps de toute erreur levée par l'API (hors validation, voir 422)."""

    detail: str = Field(description="Message en français, affichable tel quel", examples=["Crèche introuvable"])


def summary(description: str) -> str:
    """Intitulé court affiché par Swagger : début de la docstring, au lieu du nom anglais de la fonction."""
    first = description.split("\n", 1)[0].replace("**", "")
    return re.split(r"\. | : | ; ", first, maxsplit=1)[0].rstrip(".")


def raises(*errors: ErrorSpec) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Déclare les erreurs qu'une dépendance peut lever ; chaque route qui l'utilise les documente."""

    def mark(dependency: Callable[..., Any]) -> Callable[..., Any]:
        dependency.__openapi_errors__ = errors  # type: ignore[attr-defined]
        return dependency

    return mark


def error_responses(*errors: ErrorSpec) -> dict[int | str, dict[str, Any]]:
    """`responses` d'une route : un code par statut, un exemple par message."""
    grouped: dict[int, list[str]] = {}
    for code, message in errors:
        if message not in grouped.setdefault(code, []):
            grouped[code].append(message)
    return {code: {"model": Error, "description": " ; ".join(messages),
                   "content": {"application/json": {"examples": _examples(messages)}}}
            for code, messages in sorted(grouped.items())}


def retry_after(responses: dict[int | str, dict[str, Any]]) -> dict[int | str, dict[str, Any]]:
    """Ajoute l'en-tête Retry-After au 429 de `responses`."""
    responses[429]["headers"] = {"Retry-After": {"description": "Secondes à attendre avant de réessayer",
                                                 "schema": {"type": "integer"}}}
    return responses


def _examples(messages: Iterable[str]) -> dict[str, dict[str, Any]]:
    return {message: {"value": {"detail": message}} for message in messages}


def api_routes(app: FastAPI) -> Iterator[RouteContext]:
    """Routes de l'API telles que servies, préfixes compris.

    Depuis FastAPI 0.143, `app.routes` ne contient plus les routes des routeurs
    inclus, mais un `_IncludedRouter` par routeur : il faut les déplier.
    """
    for route in iter_route_contexts(app.routes):
        if isinstance(route.original_route, APIRoute):
            yield route


def dependency_calls(dependant: Dependant) -> Iterator[Callable[..., Any]]:
    """Fonctions de toutes les dépendances d'une route, sous-dépendances comprises."""
    for dependency in dependant.dependencies:
        if dependency.call is not None:
            yield dependency.call
        yield from dependency_calls(dependency)


# Imports dans les fonctions : les modules de dépendances importent `raises` d'ici.


def _security_schemes() -> dict[str, dict[str, Any]]:
    # Noms lus à la génération : ils dépendent de SESSION_COOKIE_SECURE.
    from app.auth.dependencies import cookie_name
    from app.tablets.dependencies import action_cookie_name, device_cookie_name

    return {
        "webSession": {"type": "apiKey", "in": "cookie", "name": cookie_name(),
                       "description": "Session web, posée par `POST /api/v2/auth/login`"},
        "tabletDevice": {"type": "apiKey", "in": "cookie", "name": device_cookie_name(),
                         "description": "Tablette enrôlée, posée par `POST /api/v2/nurseries/{id}/tablets`"},
        "tabletAction": {"type": "apiKey", "in": "cookie", "name": action_cookie_name(),
                         "description": "Session d'action de 2 minutes, posée par `POST /api/v2/tablet/session`"},
    }


def _security(calls: set[Callable[..., Any]]) -> list[dict[str, list[str]]] | None:
    from app.auth.dependencies import current_web_session
    from app.tablets.dependencies import current_actor, current_tablet

    if current_actor in calls:
        return [{"tabletDevice": [], "tabletAction": []}]
    if current_tablet in calls:
        return [{"tabletDevice": []}]
    if current_web_session in calls:
        return [{"webSession": []}]
    return None


def _merge(responses: dict[str, Any], errors: list[ErrorSpec]) -> None:
    for code, entry in error_responses(*errors).items():
        existing = responses.setdefault(str(code), {"description": entry["description"]})
        examples = existing.setdefault("content", {}).setdefault("application/json", {}).setdefault("examples", {})
        for message, example in entry["content"]["application/json"]["examples"].items():
            examples.setdefault(message, example)
        existing["description"] = " ; ".join(examples)


def _error_schema(code: str, response: dict[str, Any], validates_input: bool, schemas: dict[str, Any]) -> None:
    media = response.setdefault("content", {}).setdefault("application/json", {})
    error = {"$ref": "#/components/schemas/Error"}
    if code == "422" and validates_input and media.get("schema", error) == error:
        # La route lève ses propres 422 ({"detail": "…"}) en plus de ceux de la validation de FastAPI.
        media["schema"] = {"anyOf": [error, {"$ref": "#/components/schemas/HTTPValidationError"}]}
        schemas.setdefault("ValidationError", validation_error_definition)
        schemas.setdefault("HTTPValidationError", validation_error_response_definition)
    else:
        media.setdefault("schema", error)


def complete_schema(app: FastAPI) -> dict[str, Any]:
    """Schéma de FastAPI, complété des sécurités et des erreurs déduites des dépendances."""
    from app.security import ORIGIN_REFUSED

    # Copie profonde : FastAPI réutilise les dictionnaires `responses` des routes, que l'on va compléter.
    schema = copy.deepcopy(get_openapi(title=app.title, version=app.version, description=app.description,
                                       routes=app.routes, tags=app.openapi_tags,
                                       separate_input_output_schemas=app.separate_input_output_schemas))
    components = schema.setdefault("components", {})
    components["securitySchemes"] = _security_schemes()
    schemas = components.setdefault("schemas", {})
    schemas["Error"] = Error.model_json_schema()
    for route in api_routes(app):
        if not route.include_in_schema:
            continue
        calls = set(dependency_calls(route.dependant))
        derived = [error for call in calls for error in getattr(call, "__openapi_errors__", ())]
        validates_input = bool(route.dependant.path_params or route.dependant.query_params or route.body_field)
        for method in route.methods:
            operation = schema["paths"][route.path_format][method.lower()]
            if route.summary is None:
                operation["summary"] = summary(operation.get("description", ""))
            if (security := _security(calls)) is not None:
                operation["security"] = security
            errors = derived + ([ORIGIN_REFUSED] if method in UNSAFE_METHODS else [])
            _merge(operation["responses"], sorted(errors))
            for code, response in operation["responses"].items():
                if code.isdigit() and int(code) >= 400:
                    _error_schema(code, response, validates_input, schemas)
            operation["responses"] = dict(sorted(operation["responses"].items()))
    return schema


def install(app: FastAPI) -> None:
    """Remplace la génération du schéma de `app` (calculé une fois, puis gardé en cache)."""

    def openapi() -> dict[str, Any]:
        if app.openapi_schema is None:
            app.openapi_schema = complete_schema(app)
        return app.openapi_schema

    app.openapi = openapi  # type: ignore[method-assign]
