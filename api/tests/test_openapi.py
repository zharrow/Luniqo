"""Schéma OpenAPI : complet, valide, et conforme à ce que l'API fait vraiment.

Ces tests empêchent la documentation de se dégrader : une nouvelle route sans
description, une erreur sans corps documenté ou un corps de requête sans
exemple les font échouer.
"""

import dataclasses

import pytest
from fastapi.testclient import TestClient
from openapi_spec_validator import validate

from app.config import get_settings
from app.main import app, create_app

# Routes ouvertes sans session : connexion (mot de passe ou passkey), déconnexion, invitations, sonde.
PUBLIC = {
    "POST /api/v2/auth/login",
    "POST /api/v2/auth/passkeys/login/options",
    "POST /api/v2/auth/passkeys/login",
    "POST /api/v2/auth/logout",
    "POST /api/v2/invitations/lookup",
    "POST /api/v2/invitations/accept",
    "POST /api/v2/staff-invitations/lookup",
    "POST /api/v2/staff-invitations/accept",
    "GET /api/health",
}


@pytest.fixture(scope="module")
def schema():
    return app.openapi()


def operations(schema):
    for path, item in schema["paths"].items():
        for method, operation in item.items():
            yield f"{method.upper()} {path}", operation


def test_schema_conforme_a_openapi_3_1(schema):
    assert schema["openapi"].startswith("3.1")
    validate(schema)


def test_chaque_route_a_une_description_et_un_tag_documente(schema):
    tags = {tag["name"] for tag in schema["tags"]}
    assert all(tag.get("description") for tag in schema["tags"])
    for name, operation in operations(schema):
        assert operation.get("description"), name
        # Intitulé en français, tiré de la docstring, et non du nom anglais de la fonction.
        assert operation["description"].replace("**", "").startswith(operation["summary"]), name
        assert operation["tags"] and set(operation["tags"]) <= tags, name


def test_seules_les_routes_publiques_sont_sans_securite(schema):
    unsecured = {name for name, operation in operations(schema) if "security" not in operation}
    assert unsecured == PUBLIC


def test_chaque_erreur_documente_son_corps(schema):
    for name, operation in operations(schema):
        for code, response in operation["responses"].items():
            if int(code) < 400:
                continue
            media = response["content"]["application/json"]
            assert "schema" in media, f"{name} {code}"
            # Les 422 de la seule validation de FastAPI n'ont pas d'exemple : le message dépend du champ.
            assert media.get("examples") or code == "422", f"{name} {code}"


def test_chaque_corps_de_requete_a_un_exemple(schema):
    models = schema["components"]["schemas"]
    for name, operation in operations(schema):
        if "requestBody" in operation:
            reference = operation["requestBody"]["content"]["application/json"]["schema"]["$ref"]
            assert models[reference.rsplit("/", 1)[1]].get("examples"), name


def test_erreurs_des_dependances_reportees_sur_la_route(schema):
    # PATCH d'une crèche : session, second facteur, rôle, accès à la crèche, origine.
    responses = schema["paths"]["/api/v2/nurseries/{nursery_id}"]["patch"]["responses"]
    assert set(responses["401"]["content"]["application/json"]["examples"]) == {"Authentification requise"}
    assert set(responses["403"]["content"]["application/json"]["examples"]) == {
        "Second facteur requis", "Action non autorisée pour ce rôle",
        "Seule la direction peut gérer cette crèche", "Origine de la requête refusée"}
    assert "Crèche introuvable" in responses["404"]["content"]["application/json"]["examples"]
    # Une lecture n'est pas soumise au contrôle de l'origine.
    get = schema["paths"]["/api/v2/nurseries/{nursery_id}"]["get"]["responses"]
    assert "Origine de la requête refusée" not in get["403"]["content"]["application/json"]["examples"]


def test_securite_des_routes_de_tablette(schema):
    assert schema["paths"]["/api/v2/tablet"]["get"]["security"] == [{"tabletDevice": []}]
    assert schema["paths"]["/api/v2/tablet/cleaning"]["get"]["security"] == [{"tabletDevice": [], "tabletAction": []}]
    assert schema["paths"]["/api/v2/nurseries"]["get"]["security"] == [{"webSession": []}]


def test_noms_des_cookies_selon_la_configuration(schema):
    schemes = schema["components"]["securitySchemes"]
    prefix = "__Host-" if get_settings().cookie_secure else ""
    assert schemes["webSession"] == {**schemes["webSession"], "in": "cookie", "name": f"{prefix}luniqo_session"}
    assert schemes["tabletAction"]["name"] == f"{prefix}luniqo_tablet"


def test_422_de_la_route_et_de_la_validation(schema):
    response = schema["paths"]["/api/v2/nurseries/{nursery_id}"]["patch"]["responses"]["422"]
    assert response["content"]["application/json"]["schema"] == {"anyOf": [
        {"$ref": "#/components/schemas/Error"}, {"$ref": "#/components/schemas/HTTPValidationError"}]}


def test_retry_after_documente_sur_la_connexion(schema):
    assert "Retry-After" in schema["paths"]["/api/v2/auth/login"]["post"]["responses"]["429"]["headers"]


def test_interface_desactivee_mais_schema_servi():
    # Production (API_DOCS=false) : ni Swagger UI ni ReDoc, le front lit toujours le schéma.
    client = TestClient(create_app(dataclasses.replace(get_settings(), docs_enabled=False)))
    assert client.get("/api/docs").status_code == 404
    assert client.get("/api/redoc").status_code == 404
    assert client.get("/api/openapi.json").json()["info"]["title"] == "Luniqo API"


def test_api_docs_false_lu_dans_l_environnement(monkeypatch):
    monkeypatch.setenv("API_DOCS", "false")
    get_settings.cache_clear()
    try:
        assert get_settings().docs_enabled is False
    finally:
        get_settings.cache_clear()
