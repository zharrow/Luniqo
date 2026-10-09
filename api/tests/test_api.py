from app import __version__


def test_health_ok(client_with):
    response = client_with().get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok", "version": __version__}


def test_health_base_injoignable_renvoie_503(client_with):
    response = client_with(fail=True).get("/api/health")
    assert response.status_code == 503
    assert response.json()["database"] == "unreachable"


def test_documentation_swagger_servie_sous_api(client_with):
    client = client_with()
    assert client.get("/api/docs").status_code == 200
    assert client.get("/api/openapi.json").json()["info"]["title"] == "Luniqo API"



def test_aucune_dependance_synchrone():
    # FastAPI exécute une dépendance `def` dans un thread : sous charge, la
    # limite de processus du conteneur (pids) est dépassée. Régression LUN-003.
    import inspect

    from fastapi.routing import APIRoute

    from app.main import app

    def walk(dependant):
        for dependency in dependant.dependencies:
            yield dependency.call
            yield from walk(dependency)

    synchronous = {
        f"{route.path} → {call.__qualname__}"
        for route in app.routes if isinstance(route, APIRoute)
        for call in walk(route.dependant)
        if not (inspect.iscoroutinefunction(call) or inspect.isasyncgenfunction(call))
    }
    assert synchronous == set()
