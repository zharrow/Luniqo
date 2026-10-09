"""Authentification de bout en bout sur PostgreSQL : routes, dépôt SQL, requêtes de limitation."""

import hashlib
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.auth.dependencies import get_now
from app.auth.models import AuthEvent, UserRole, UserSession
from app.auth.repository import SqlAuthRepository
from app.auth.service import Client, revoke_all_sessions
from app.main import app
from tests.integration.conftest import login

pytestmark = pytest.mark.anyio
COOKIE = "__Host-luniqo_session"


async def test_connexion_me_deconnexion(http, data, db):
    # Régression : erreur 500 (MissingGreenlet) à la connexion, invisible avec le dépôt en mémoire.
    user = await data.user("direction@a.test", UserRole.GUARDIAN)
    response = await login(http, "Direction@A.test")
    assert response.status_code == 200, response.text
    assert response.json()["id"] == str(user.id)

    token = http.cookies[COOKIE]
    stored = await db.scalar(select(UserSession).where(UserSession.user_id == user.id))
    assert stored.token_digest == hashlib.sha256(token.encode()).digest()

    assert (await http.get("/api/v2/auth/me")).status_code == 200
    assert (await http.post("/api/v2/auth/logout")).status_code == 204
    assert await db.scalar(select(func.count()).select_from(UserSession)) == 0
    http.cookies.set(COOKIE, token, domain="testserver")
    assert (await http.get("/api/v2/auth/me")).status_code == 401


async def test_echec_journalise_sans_secret(http, data, db):
    await data.user("parent@a.test", UserRole.GUARDIAN)
    assert (await login(http, "parent@a.test", "mauvaise phrase de passe")).status_code == 401
    assert (await login(http, "inconnu@a.test", "mauvaise phrase de passe")).status_code == 401
    events = (await db.scalars(select(AuthEvent).order_by(AuthEvent.id))).all()
    assert [(e.event, e.detail, e.email) for e in events] == [
        ("login_failed", "bad_password", "parent@a.test"),
        ("login_failed", "unknown_account", "inconnu@a.test"),
    ]
    assert all(e.ip == "127.0.0.1" for e in events)


async def test_limitation_par_compte_sur_la_vraie_requete(http, data):
    await data.user("cible@a.test", UserRole.GUARDIAN)
    for _ in range(5):
        assert (await login(http, "cible@a.test", "mauvaise phrase de passe")).status_code == 401
    response = await login(http, "cible@a.test")
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) >= 1


async def test_requete_de_limitation_compte_et_ip(db):
    """La requête SQL à FILTER compte séparément par adresse et par IP, dans la fenêtre seulement."""
    now = datetime(2026, 10, 8, 9, 0, tzinfo=UTC)
    rows = [
        ("login_failed", "a@a.test", "10.0.0.1", now - timedelta(minutes=1)),
        ("login_failed", "a@a.test", "10.0.0.2", now - timedelta(minutes=2)),
        ("login_failed", "b@a.test", "10.0.0.1", now - timedelta(minutes=3)),
        ("login_failed", "a@a.test", "10.0.0.1", now - timedelta(minutes=20)),  # hors fenêtre
        ("login_succeeded", "a@a.test", "10.0.0.1", now),  # pas un échec
    ]
    db.add_all(AuthEvent(event=e, email=m, ip=i, occurred_at=t) for e, m, i, t in rows)
    await db.flush()
    by_email, by_ip = await SqlAuthRepository(db).login_failures(email="a@a.test", ip="10.0.0.1",
                                                                 since=now - timedelta(minutes=15))
    assert (by_email.count, by_email.last) == (2, now - timedelta(minutes=1))
    assert (by_ip.count, by_ip.last) == (2, now - timedelta(minutes=1))
    _, no_ip = await SqlAuthRepository(db).login_failures(email="a@a.test", ip=None,
                                                          since=now - timedelta(minutes=15))
    assert (no_ip.count, no_ip.last) == (0, None)


async def test_session_expiree_supprimee_en_base(http, data, db):
    await data.user("parent@a.test", UserRole.GUARDIAN)
    start = datetime.now(UTC)
    clock = {"now": start}

    async def override_now():
        return clock["now"]

    app.dependency_overrides[get_now] = override_now
    assert (await login(http, "parent@a.test")).status_code == 200
    clock["now"] = start + timedelta(minutes=10)
    assert (await http.get("/api/v2/auth/me")).status_code == 200
    stored = await db.scalar(select(UserSession))
    assert stored.last_seen_at == clock["now"]
    clock["now"] = start + timedelta(minutes=41)
    assert (await http.get("/api/v2/auth/me")).status_code == 401
    assert await db.scalar(select(func.count()).select_from(UserSession)) == 0
    assert await db.scalar(select(func.count()).select_from(AuthEvent).where(AuthEvent.event == "session_expired")) == 1


async def test_revocation_de_toutes_les_sessions(http, data, db):
    user = await data.user("parent@a.test", UserRole.GUARDIAN)
    await login(http, "parent@a.test")
    await login(http, "parent@a.test")  # remplace la première session du même client
    http.cookies.clear()
    await login(http, "parent@a.test")
    assert await db.scalar(select(func.count()).select_from(UserSession)) == 2
    revoked = await revoke_all_sessions(SqlAuthRepository(db), user.id, Client("127.0.0.1", None),
                                        datetime.now(UTC), "password_changed")
    assert revoked == 2
    assert (await http.get("/api/v2/auth/me")).status_code == 401
