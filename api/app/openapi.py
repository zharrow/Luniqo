"""Schéma OpenAPI : ce que Swagger (/api/docs) montre en plus de ce que FastAPI déduit seul.

- Les erreurs se déclarent à côté de l'endroit où elles sont levées :
  `raises(...)` sur une dépendance, `error_responses(...)` sur une route.
  `complete_schema` reporte celles des dépendances sur chaque route qui les
  déclare : une route protégée documente son 401 sans qu'on y pense.
- Les cookies d'authentification deviennent des schémas de sécurité, eux
  aussi déduits des dépendances de chaque route.
- Toute erreur documentée a le corps unique des erreurs de l'API,
  `{"detail", "code", "fields"?}` (schéma `Error`, app/errors.py), avec un
  exemple par code possible. Toute route qui lit des paramètres ou un corps
  documente la 422 `validation_error`.
"""

import copy
import re
from collections.abc import Callable, Iterable, Iterator
from typing import Any

from fastapi import FastAPI
from fastapi.dependencies.models import Dependant
from fastapi.openapi.utils import get_openapi
from fastapi.routing import APIRoute, RouteContext, iter_route_contexts
from pydantic import BaseModel, ConfigDict, Field

from app.errors import EMPTY_FIELD, INTERNAL_ERROR, VALIDATION_ERROR, ErrorSpec

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
secours) : tant que ce n'est pas fait, les routes répondent 403 `mfa_required`
(« Second facteur requis »), sauf `/auth/me`, la déconnexion et `/auth/mfa`.

## Protection contre les requêtes intersites

Les requêtes `POST`, `PUT`, `PATCH` et `DELETE` doivent porter un en-tête
`Origin` égal à l'origine de Luniqo, sinon : 403 `origin_refused`.
Les navigateurs l'envoient d'eux-mêmes ; avec `curl`, ajouter `-H 'Origin: http://localhost:8080'`.

## Conventions

- Erreurs : `{"detail": "message en français", "code": "code_stable"}`. Le
  `detail` s'affiche tel quel et peut être reformulé ; le `code` ne change jamais :
  c'est sur lui qu'un client décide. Une saisie refusée (422 `validation_error`,
  ou refus métier d'un champ) ajoute `fields`, un message par champ. Toute 429
  porte l'en-tête `Retry-After` (secondes).
- Chaque réponse porte l'en-tête `X-Request-ID`, la référence de la requête,
  reprise du client si elle est sûre. Une erreur serveur (5xx) la répète dans
  `request_id` : c'est elle qu'on donne au support pour retrouver l'erreur dans
  le journal. Une exception imprévue répond 500 `internal_error`, sans rien
  d'interne.
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
    {"name": "transmissions", "description": "Transmissions de la journée sur un enfant, entre collègues "
                                             "(pas d'information médicale)."},
    {"name": "ménage", "description": "Pièces, catalogue des tâches, fiche du jour, coches et historique."},
    {"name": "espace famille", "description": "Invitation des parents et consultation de leurs enfants."},
    {"name": "à traiter", "description": "Ce qui demande un geste de la direction, toutes crèches confondues : "
                                       "PIN bloqués, tablettes, départs non pointés, mises en route."},
    {"name": "supervision", "description": "Sondes de l'exploitation."},
]


_EXAMPLE_REQUEST_ID = "6f1c0b0e9d2a4c5183e7a1b2c3d4e5f6"


class Error(BaseModel):
    """Corps de toute erreur de l'API."""

    model_config = ConfigDict(json_schema_extra={"examples": [
        {"detail": "Crèche introuvable", "code": "nursery_not_found"},
        {"detail": VALIDATION_ERROR.message, "code": VALIDATION_ERROR.code, "fields": {"name": EMPTY_FIELD}},
        {"detail": INTERNAL_ERROR.message, "code": INTERNAL_ERROR.code, "request_id": _EXAMPLE_REQUEST_ID},
    ]})

    detail: str = Field(description="Message en français, affichable tel quel ; peut être reformulé")
    code: str = Field(pattern=r"^[a-z][a-z0-9_]*$",
                      description="Identifiant stable de l'erreur (snake_case) : ne change jamais une fois publié")
    fields: dict[str, str] | None = Field(default=None, description="Saisie refusée : un message par champ")
    request_id: str | None = Field(default=None, description="Erreur serveur (5xx) : référence de la requête, "
                                                             "à donner au support ; aussi dans l'en-tête X-Request-ID")


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
    """`responses` d'une route : une entrée par statut HTTP, un exemple par code d'erreur."""
    grouped: dict[int, list[ErrorSpec]] = {}
    for spec in errors:
        if spec not in grouped.setdefault(spec.status, []):
            grouped[spec.status].append(spec)
    return {code: {"model": Error, "description": _description(specs),
                   "content": {"application/json": {"examples": _examples(specs)}}}
            for code, specs in sorted(grouped.items())}


def retry_after(responses: dict[int | str, dict[str, Any]]) -> dict[int | str, dict[str, Any]]:
    """Ajoute l'en-tête Retry-After au 429 de `responses`."""
    responses[429]["headers"] = {"Retry-After": {"description": "Secondes à attendre avant de réessayer",
                                                 "schema": {"type": "integer"}}}
    return responses


def _examples(specs: Iterable[ErrorSpec]) -> dict[str, dict[str, Any]]:
    """Exemples indexés par code ; un code à plusieurs messages (politique des mots de passe…) en a plusieurs."""
    examples: dict[str, dict[str, Any]] = {}
    for spec in specs:
        key, rank = spec.code, 1
        while key in examples:
            rank += 1
            key = f"{spec.code} ({rank})"
        value: dict[str, Any] = {"detail": spec.message, "code": spec.code}
        if spec == VALIDATION_ERROR:
            value["fields"] = {"name": EMPTY_FIELD}
        if spec.status >= 500:
            value["request_id"] = _EXAMPLE_REQUEST_ID
        examples[key] = {"summary": spec.message, "value": value}
    return examples


def _description(specs: Iterable[ErrorSpec]) -> str:
    return " ; ".join(f"`{spec.code}` : {spec.message}" for spec in specs)


def documented_codes(response: dict[str, Any]) -> set[str]:
    """Codes d'erreur documentés par une réponse du schéma."""
    examples = response.get("content", {}).get("application/json", {}).get("examples", {})
    return {example["value"]["code"] for example in examples.values()}


def _template(path: str) -> re.Pattern[str]:
    return re.compile(re.sub(r"\\\{[^}]+\\\}", "[^/]+", re.escape(path)))


def undocumented_errors(schema: dict[str, Any],
                        observed: Iterable[tuple[str, str, int, str]]) -> set[tuple[str, str, int, str]]:
    """Erreurs rendues par l'API (méthode, chemin, statut, code) absentes du schéma de leur route.

    Une requête qui ne correspond à aucune opération du schéma (route ou méthode
    inconnue, application de test) est ignorée : c'est Starlette qui répond.
    """
    templates = sorted(schema["paths"], key=lambda path: (path.count("{"), -len(path)))
    patterns = [(path, _template(path)) for path in templates]
    missing = set()
    for method, path, status, code in observed:
        template = next((name for name, pattern in patterns if pattern.fullmatch(path)), None)
        operation = schema["paths"].get(template, {}).get(method.lower()) if template else None
        if operation is None:
            continue
        if code not in documented_codes(operation["responses"].get(str(status), {})):
            missing.add((method, template, status, code))
    return missing


def api_routes(app: FastAPI) -> Iterator[RouteContext]:
    """Routes de l'API telles que servies, préfixes compris.

    Depuis FastAPI 0.143, `app.routes` ne contient plus les routes des routeurs
    inclus, mais un `_IncludedRouter` par routeur : il faut les déplier.
    """
    for route in iter_route_contexts(app.routes):
        if isinstance(route.original_route, APIRoute):
            yield route


def _reads_parameters(dependant: Dependant) -> bool:
    """Vrai si la route ou l'une de ses dépendances lit un paramètre validé (chemin, requête, en-tête)."""
    if dependant.path_params or dependant.query_params or dependant.header_params:
        return True
    return any(_reads_parameters(dependency) for dependency in dependant.dependencies)


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
        existing = responses.get(str(code))
        if existing is None or "examples" not in existing.get("content", {}).get("application/json", {}):
            # Absente, ou réponse 422 par défaut de FastAPI (corps HTTPValidationError) : remplacée.
            responses[str(code)] = copy.deepcopy(entry)
            continue
        examples = existing["content"]["application/json"]["examples"]
        for key, example in entry["content"]["application/json"]["examples"].items():
            if example["value"] not in (known["value"] for known in examples.values()):
                examples[key if key not in examples else f"{key} ({len(examples) + 1})"] = example
        existing["description"] = " ; ".join(f"`{example['value']['code']}` : {example['value']['detail']}"
                                             for example in examples.values())


def _error_schema(response: dict[str, Any]) -> None:
    response.pop("model", None)
    media = response.setdefault("content", {}).setdefault("application/json", {})
    media["schema"] = {"$ref": "#/components/schemas/Error"}


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
        if route.body_field or _reads_parameters(route.dependant):
            derived.append(VALIDATION_ERROR)
        for method in route.methods:
            operation = schema["paths"][route.path_format][method.lower()]
            if route.summary is None:
                operation["summary"] = summary(operation.get("description", ""))
            if (security := _security(calls)) is not None:
                operation["security"] = security
            errors = derived + ([ORIGIN_REFUSED] if method in UNSAFE_METHODS else [])
            if route.path_format != "/api/health":  # la sonde garde son propre corps
                errors.append(INTERNAL_ERROR)
            _merge(operation["responses"], sorted(errors))
            for code, response in operation["responses"].items():
                if code.isdigit() and int(code) >= 400 and route.path_format != "/api/health":
                    _error_schema(response)
            operation["responses"] = dict(sorted(operation["responses"].items()))
    # Corps de validation de FastAPI : remplacé partout par `Error`.
    schemas.pop("HTTPValidationError", None)
    schemas.pop("ValidationError", None)
    return schema


def install(app: FastAPI) -> None:
    """Remplace la génération du schéma de `app` (calculé une fois, puis gardé en cache)."""

    def openapi() -> dict[str, Any]:
        if app.openapi_schema is None:
            app.openapi_schema = complete_schema(app)
        return app.openapi_schema

    app.openapi = openapi  # type: ignore[method-assign]
