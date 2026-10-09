"""Protection contre les requêtes intersites (CSRF), ADR-003.

Toute requête qui peut modifier des données (POST, PUT, PATCH, DELETE) doit
porter un en-tête Origin égal à l'une des origines de Luniqo. Les navigateurs
l'envoient toujours sur ces méthodes et un site tiers ne peut pas le falsifier.
Une requête sans Origin est refusée aussi : l'API ne sert que le front.

Middleware ASGI plutôt que dépendance de route : une nouvelle route est
protégée sans qu'on ait à y penser.
"""

import json

from starlette.types import ASGIApp, Receive, Scope, Send

from app.config import get_settings

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


class OriginCheckMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] in SAFE_METHODS:
            await self.app(scope, receive, send)
            return
        origin = dict(scope["headers"]).get(b"origin", b"").decode("latin-1").rstrip("/")
        if origin in get_settings().app_origins:
            await self.app(scope, receive, send)
            return
        body = json.dumps({"detail": "Origine de la requête refusée"}).encode()
        await send({
            "type": "http.response.start",
            "status": 403,
            "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
        })
        await send({"type": "http.response.body", "body": body})
