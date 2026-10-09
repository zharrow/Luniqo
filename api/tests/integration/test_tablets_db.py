"""Tablette et PIN de bout en bout sur PostgreSQL (LUN-005). Correction par conception d'ANO-001 en v2."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.auth.dependencies import get_now
from app.auth.models import AppUser, AuthEvent, UserRole, UserSession
from app.auth.passwords import hash_password_sync
from app.main import app
from tests.auth.conftest import PASSWORD
from tests.integration.conftest import login

pytestmark = pytest.mark.anyio

PIN = "2580"
PIN_HASH = hash_password_sync(PIN)
DEVICE = "__Host-luniqo_device"
ACTION = "__Host-luniqo_tablet"
WEB = "__Host-luniqo_session"


class Clock:
    def __init__(self) -> None:
        self.now = datetime.now(UTC)

    def advance(self, **delta: float) -> None:
        self.now += timedelta(**delta)


@pytest.fixture
def clock():
    clock = Clock()

    async def override_now():
        return clock.now

    app.dependency_overrides[get_now] = override_now
    return clock


@pytest.fixture
async def world(data, db):
    a, b = await data.enterprise("Groupe A"), await data.enterprise("Groupe B")
    w = {"a": a, "nord": await data.nursery(a, "Crèche Nord"), "sud": await data.nursery(a, "Crèche Sud"),
         "temoin": await data.nursery(b, "Crèche Témoin"),
         "owner": await data.user("direction@a.test", UserRole.OWNER, a),
         "owner_b": await data.user("direction@b.test", UserRole.OWNER, b)}
    for key, nursery in (("lea", "nord"), ("hugo", "nord"), ("sud_only", "sud")):
        user = await data.user(f"{key}@a.test", UserRole.EMPLOYEE, a)
        user.first_name, user.last_name, user.pin_hash = key.capitalize(), "Test", PIN_HASH
        await data.grant(user, w[nursery])
        w[key] = user
    await db.flush()
    return w


async def enrolled_tablet(clients, world, nursery="nord"):
    """La direction se connecte sur la tablette, l'enrôle, puis se déconnecte : seul le cookie d'appareil reste."""
    tablet = clients()
    assert (await login(tablet, "direction@a.test")).status_code == 200
    response = await tablet.post(f"/api/v2/nurseries/{world[nursery].id}/tablets", json={"label": "Entrée"})
    assert response.status_code == 201, response.text
    assert (await tablet.post("/api/v2/auth/logout")).status_code == 204
    assert DEVICE in tablet.cookies and WEB not in tablet.cookies
    return tablet, response


async def pin_login(tablet, user, pin=PIN):
    return await tablet.post("/api/v2/tablet/session", json={"user_id": str(user.id), "pin": pin})


# --- Enrôlement ----------------------------------------------------------------

async def test_enrolement_pose_un_cookie_d_appareil_durci(clients, world, db):
    _, response = await enrolled_tablet(clients, world)
    set_cookie = response.headers["set-cookie"]
    for attribute in ("HttpOnly", "Secure", "SameSite=strict", "Path=/", "Max-Age=7776000"):
        assert attribute in set_cookie
    body = response.json()
    assert body["label"] == "Entrée" and "token" not in str(body).lower()
    assert await db.scalar(select(func.count()).select_from(AuthEvent).where(
        AuthEvent.event == "tablet_enrolled")) == 1


@pytest.mark.parametrize(("email", "expected"), [("lea@a.test", 403), ("direction@b.test", 404)])
async def test_enrolement_reserve_a_la_direction_de_la_creche(http, world, email, expected):
    await login(http, email)
    response = await http.post(f"/api/v2/nurseries/{world['nord'].id}/tablets", json={"label": "x"})
    assert response.status_code == expected


async def test_sans_tablette_enrolee_rien_n_est_accessible(http, world):
    assert (await http.get("/api/v2/tablet")).status_code == 401
    assert (await pin_login(http, world["lea"])).status_code == 401


# --- Liste et session d'action -------------------------------------------------

async def test_parcours_tablette(clients, world):
    tablet, _ = await enrolled_tablet(clients, world)
    info = await tablet.get("/api/v2/tablet")
    assert info.status_code == 200
    assert info.json()["nursery_name"] == "Crèche Nord"
    staff = {member["display_name"]: member for member in info.json()["staff"]}
    # Employés de la crèche seulement, prénom et initiale, jamais de haché.
    assert set(staff) == {"Lea T.", "Hugo T."}
    assert "argon2" not in info.text and "pin_hash" not in info.text and "@" not in info.text

    response = await pin_login(tablet, world["lea"])
    assert response.status_code == 201, response.text
    assert "Max-Age=120" in response.headers["set-cookie"]
    assert (await tablet.get("/api/v2/tablet/session")).json()["display_name"] == "Lea T."

    assert (await tablet.delete("/api/v2/tablet/session")).status_code == 204
    assert (await tablet.get("/api/v2/tablet/session")).status_code == 401


async def test_session_d_action_refusee_par_l_espace_web(clients, world):
    tablet, _ = await enrolled_tablet(clients, world)
    await pin_login(tablet, world["lea"])
    # Ni comme telle, ni recopiée dans le cookie de session web.
    assert (await tablet.get("/api/v2/auth/me")).status_code == 401
    assert (await tablet.get("/api/v2/nurseries")).status_code == 401
    tablet.cookies.set(WEB, tablet.cookies[ACTION], domain="testserver")
    assert (await tablet.get("/api/v2/auth/me")).status_code == 401


async def test_session_d_action_de_2_minutes(clients, world, clock):
    tablet, _ = await enrolled_tablet(clients, world)
    await pin_login(tablet, world["lea"])
    clock.advance(seconds=119)
    assert (await tablet.get("/api/v2/tablet/session")).status_code == 200
    clock.advance(seconds=1)
    assert (await tablet.get("/api/v2/tablet/session")).status_code == 401


async def test_une_seule_session_par_tablette(clients, world, db):
    tablet, _ = await enrolled_tablet(clients, world)
    await pin_login(tablet, world["lea"])
    await pin_login(tablet, world["hugo"])
    sessions = (await db.scalars(select(UserSession).where(UserSession.kind == "tablet"))).all()
    assert [session.user_id for session in sessions] == [world["hugo"].id]


async def test_employe_d_une_autre_creche_refuse(clients, world):
    tablet, _ = await enrolled_tablet(clients, world)
    assert (await pin_login(tablet, world["sud_only"])).status_code == 401
    assert (await pin_login(tablet, world["owner"])).status_code == 401


async def test_acces_retire_coupe_la_session_en_cours(clients, world):
    tablet, _ = await enrolled_tablet(clients, world)
    await pin_login(tablet, world["lea"])
    owner = clients()
    await login(owner, "direction@a.test")
    url = f"/api/v2/nurseries/{world['nord'].id}/staff/{world['lea'].id}"
    assert (await owner.delete(url)).status_code == 204
    assert (await tablet.get("/api/v2/tablet/session")).status_code == 401
    names = {member["display_name"] for member in (await tablet.get("/api/v2/tablet")).json()["staff"]}
    assert names == {"Hugo T."}


# --- PIN : erreurs, blocage, déblocage ----------------------------------------

async def test_pin_bloque_au_troisieme_echec_puis_debloque_par_la_direction(clients, world, db):
    tablet, _ = await enrolled_tablet(clients, world)
    assert (await pin_login(tablet, world["lea"], "1111")).status_code == 401
    assert (await pin_login(tablet, world["lea"], "1111")).status_code == 401
    assert (await pin_login(tablet, world["lea"], "1111")).status_code == 423
    # Même le bon PIN est refusé tant que la direction n'a pas débloqué.
    assert (await pin_login(tablet, world["lea"])).status_code == 423
    staff = {m["display_name"]: m for m in (await tablet.get("/api/v2/tablet")).json()["staff"]}
    assert staff["Lea T."]["pin_locked"] is True

    owner_b = clients()
    await login(owner_b, "direction@b.test")
    assert (await owner_b.post(f"/api/v2/staff/{world['lea'].id}/pin/unlock")).status_code == 404

    owner = clients()
    await login(owner, "direction@a.test")
    assert (await owner.post(f"/api/v2/staff/{world['lea'].id}/pin/unlock")).status_code == 204
    assert (await pin_login(tablet, world["lea"])).status_code == 201
    user = await db.get(AppUser, world["lea"].id)
    assert (user.pin_failed_attempts, user.pin_locked_at) == (0, None)


async def test_un_succes_remet_le_compteur_a_zero(clients, world):
    tablet, _ = await enrolled_tablet(clients, world)
    for _ in range(2):
        assert (await pin_login(tablet, world["lea"], "1111")).status_code == 401
    assert (await pin_login(tablet, world["lea"])).status_code == 201
    for _ in range(2):
        assert (await pin_login(tablet, world["lea"], "1111")).status_code == 401
    assert (await pin_login(tablet, world["lea"])).status_code == 201


async def test_tablette_bloquee_apres_10_echecs_tous_employes_confondus(clients, world, data, db):
    tablet, _ = await enrolled_tablet(clients, world)
    extra = []
    for index in range(3):
        user = await data.user(f"renfort{index}@a.test", UserRole.EMPLOYEE, world["a"])
        user.pin_hash = PIN_HASH
        await data.grant(user, world["nord"])
        extra.append(user)
    await db.flush()
    # 2 erreurs par employé : aucun PIN bloqué, mais 10 échecs sur la tablette.
    for user in [world["lea"], world["hugo"], *extra]:
        for _ in range(2):
            assert (await pin_login(tablet, user, "1111")).status_code == 401
    assert (await pin_login(tablet, world["lea"])).status_code == 429


async def test_pin_non_defini(clients, world, db):
    world["hugo"].pin_hash = None
    await db.flush()
    tablet, _ = await enrolled_tablet(clients, world)
    assert (await pin_login(tablet, world["hugo"])).status_code == 409


# --- Choix du PIN par l'employé ----------------------------------------------

async def test_l_employe_choisit_son_pin_et_debloque(clients, world, db):
    tablet, _ = await enrolled_tablet(clients, world)
    for _ in range(3):
        await pin_login(tablet, world["lea"], "1111")
    web = clients()
    await login(web, "lea@a.test")
    response = await web.put("/api/v2/auth/me/pin", json={"pin": "9137", "password": PASSWORD})
    assert response.status_code == 204, response.text
    assert (await pin_login(tablet, world["lea"], "9137")).status_code == 201
    assert (await pin_login(tablet, world["hugo"], PIN)).status_code == 201


@pytest.mark.parametrize(("body", "expected"), [
    ({"pin": "9137", "password": "mauvaise phrase de passe"}, 403),
    ({"pin": "1234", "password": PASSWORD}, 422),
    ({"pin": "abcd", "password": PASSWORD}, 422),
])
async def test_choix_du_pin_refuse(http, world, body, expected):
    await login(http, "lea@a.test")
    assert (await http.put("/api/v2/auth/me/pin", json=body)).status_code == expected


async def test_pin_reserve_aux_employes(http, world):
    await login(http, "direction@a.test")
    response = await http.put("/api/v2/auth/me/pin", json={"pin": "9137", "password": PASSWORD})
    assert response.status_code == 403


async def test_confirmations_par_mot_de_passe_limitees(http, world):
    await login(http, "lea@a.test")
    for _ in range(5):
        response = await http.put("/api/v2/auth/me/pin", json={"pin": "9137", "password": "mauvaise phrase"})
        assert response.status_code == 403
    response = await http.put("/api/v2/auth/me/pin", json={"pin": "9137", "password": PASSWORD})
    assert response.status_code == 429


async def test_changer_de_pin_ferme_les_sessions_de_tablette(clients, world, db):
    tablet, _ = await enrolled_tablet(clients, world)
    await pin_login(tablet, world["lea"])
    web = clients()
    await login(web, "lea@a.test")
    await web.put("/api/v2/auth/me/pin", json={"pin": "9137", "password": PASSWORD})
    assert (await tablet.get("/api/v2/tablet/session")).status_code == 401


# --- Cycle de vie de la tablette --------------------------------------------

async def test_revocation_immediate(clients, world, db):
    tablet, enrolled = await enrolled_tablet(clients, world)
    await pin_login(tablet, world["lea"])
    owner = clients()
    await login(owner, "direction@a.test")
    tablets = await owner.get(f"/api/v2/nurseries/{world['nord'].id}/tablets")
    assert [t["label"] for t in tablets.json()] == ["Entrée"]
    url = f"/api/v2/nurseries/{world['nord'].id}/tablets/{enrolled.json()['id']}"
    assert (await owner.delete(url)).status_code == 204
    assert (await tablet.get("/api/v2/tablet")).status_code == 401
    assert (await tablet.get("/api/v2/tablet/session")).status_code == 401
    assert await db.scalar(select(func.count()).select_from(UserSession).where(UserSession.kind == "tablet")) == 0
    # Révoquer depuis une autre crèche : introuvable.
    assert (await owner.delete(f"/api/v2/nurseries/{world['sud'].id}/tablets/{enrolled.json()['id']}")
            ).status_code == 404


async def test_tablette_expiree_apres_90_jours(clients, world, clock):
    tablet, _ = await enrolled_tablet(clients, world)
    clock.advance(days=89, hours=23)
    assert (await tablet.get("/api/v2/tablet")).status_code == 200
    clock.advance(hours=1)
    assert (await tablet.get("/api/v2/tablet")).status_code == 401


async def test_creche_fermee_desactive_la_tablette(clients, world, db):
    tablet, _ = await enrolled_tablet(clients, world)
    world["nord"].is_active = False
    await db.flush()
    assert (await tablet.get("/api/v2/tablet")).status_code == 401


async def test_journal_trace_la_tablette_sans_secret(clients, world, db):
    tablet, enrolled = await enrolled_tablet(clients, world)
    await pin_login(tablet, world["lea"], "1111")
    await pin_login(tablet, world["lea"])
    events = (await db.scalars(select(AuthEvent).where(AuthEvent.event.like("pin_%")).order_by(AuthEvent.id))).all()
    assert [(e.event, e.detail) for e in events] == [("pin_failed", "bad_pin"), ("pin_succeeded", None)]
    assert all(str(e.tablet_id) == enrolled.json()["id"] for e in events)
    assert not any(PIN in str(vars(e)) or "1111" in str(vars(e)) for e in events)
