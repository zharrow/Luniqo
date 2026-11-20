"""Liste « À traiter » sur PostgreSQL (LUN-153) : faits réels, isolation, jour de Paris."""

import os
import uuid
from datetime import UTC, date, datetime, timedelta

import pytest

from app.attendance.models import Attendance
from app.auth.dependencies import get_now
from app.auth.models import UserRole
from app.children.models import Child, ChildStatus, Family
from app.main import app
from app.tablets.models import TabletDevice
from app.todo.policy import NurseryRef, departure_window, tablet_window
from app.todo.service import SqlToDoRepository
from tests.integration.conftest import login

pytestmark = pytest.mark.anyio
NOW = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)  # 11 h à Paris
URL = "/api/v2/to-do"
DOMAIN = "todo.test"


def mail(name: str) -> str:
    return f"{name}@{DOMAIN}"


def _clock(now: datetime) -> None:
    async def get_clock():
        return now

    app.dependency_overrides[get_now] = get_clock


@pytest.fixture(autouse=True)
def clock():
    _clock(NOW)


async def _employee(data, db, name, enterprise, nurseries, *, first_name, locked_at=None, active=True):
    user = await data.user(mail(name), UserRole.EMPLOYEE, enterprise)
    user.first_name, user.last_name = first_name, "Démo"
    user.pin_locked_at, user.is_active = locked_at, active
    for nursery in nurseries:
        await data.grant(user, nursery)
    await db.flush()
    return user


def _tablet(db, nursery, label, expires_at, revoked_at=None) -> TabletDevice:
    tablet = TabletDevice(id=uuid.uuid4(), nursery_id=nursery.id, enterprise_id=nursery.enterprise_id, label=label,
                          token_digest=os.urandom(32), created_at=expires_at - timedelta(days=90),
                          expires_at=expires_at, revoked_at=revoked_at)
    db.add(tablet)
    return tablet


async def _presence(db, nursery, first_name, day, arrived_at, departed_at=None) -> Child:
    family = Family(id=uuid.uuid4(), nursery_id=nursery.id, label="Famille Démo", is_active=True)
    db.add(family)
    await db.flush()
    kid = Child(id=uuid.uuid4(), nursery_id=nursery.id, family_id=family.id, first_name=first_name, last_name="Démo",
                birth_date=date(2024, 1, 1), enrollment_date=date(2025, 9, 1), status=ChildStatus.ACTIVE)
    db.add(kid)
    await db.flush()
    db.add(Attendance(id=uuid.uuid4(), child_id=kid.id, nursery_id=nursery.id, day=day, arrived_at=arrived_at,
                      departed_at=departed_at))
    await db.flush()
    return kid


def _at(day: date, hour: int = 7, minute: int = 30) -> datetime:
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=UTC)


@pytest.fixture
async def world(data, db):
    a, b = await data.enterprise("Groupe A"), await data.enterprise("Groupe B")
    nord, sud = await data.nursery(a, "Nord"), await data.nursery(a, "Sud")
    fermee = await data.nursery(a, "Fermée", active=False)
    temoin = await data.nursery(b, "Témoin")
    for rank, nursery in enumerate((nord, sud, fermee, temoin)):
        nursery.created_at = datetime(2026, 9, 1, 8, 0, tzinfo=UTC) + timedelta(days=rank)
    await data.user(mail("direction-a"), UserRole.OWNER, a)
    await data.user(mail("direction-b"), UserRole.OWNER, b)
    locked = NOW - timedelta(hours=2)
    # Camille : PIN bloqué, accès à Nord et Sud → un élément par crèche.
    camille = await _employee(data, db, "camille", a, [nord, sud], first_name="Camille", locked_at=locked)
    # Partie (inactive), sans accès, d'une autre entreprise (listée seulement pour la sienne).
    await _employee(data, db, "partie", a, [nord], first_name="Partie", locked_at=locked, active=False)
    await _employee(data, db, "sans-acces", a, [], first_name="Sans", locked_at=locked)
    await _employee(data, db, "autre", b, [temoin], first_name="Autre", locked_at=locked)
    await _employee(data, db, "libre", a, [nord, sud], first_name="Libre")
    tablets = {
        "expiree": _tablet(db, nord, "Nord expirée", NOW - timedelta(days=5)),
        "revoquee": _tablet(db, nord, "Nord révoquée", NOW - timedelta(days=5), revoked_at=NOW - timedelta(days=6)),
        "revoquee_bientot": _tablet(db, nord, "Nord révoquée bientôt", NOW + timedelta(days=3),
                                    revoked_at=NOW - timedelta(days=1)),
        "bientot": _tablet(db, sud, "Sud bientôt", NOW + timedelta(days=3)),
        "trop_ancienne": _tablet(db, sud, "Sud trop ancienne", NOW - timedelta(days=31)),
        "lointaine": _tablet(db, sud, "Sud lointaine", NOW + timedelta(days=60)),
        "temoin": _tablet(db, temoin, "Témoin bientôt", NOW + timedelta(days=3)),
        "fermee": _tablet(db, fermee, "Fermée bientôt", NOW + timedelta(days=3)),
    }
    await db.flush()
    nov_19, nov_20 = date(2026, 11, 19), date(2026, 11, 20)
    leo = await _presence(db, nord, "Léo", nov_19, _at(nov_19))
    emma = await _presence(db, nord, "Emma", date(2026, 10, 20), _at(date(2026, 10, 20)))  # 31 jours : listée
    await _presence(db, nord, "Trop vieux", date(2026, 10, 19), _at(date(2026, 10, 19)))  # 32 jours : non
    await _presence(db, sud, "Aujourd'hui", nov_20, _at(nov_20))
    await _presence(db, sud, "Parti", nov_19, _at(nov_19, 7, 0), departed_at=_at(nov_19, 16, 0))
    await _presence(db, temoin, "Témoin", nov_19, _at(nov_19))
    return {"nord": nord, "sud": sud, "fermee": fermee, "temoin": temoin, "camille": camille, "leo": leo,
            "emma": emma, "tablets": tablets}


def _summary(body) -> list[tuple]:
    return [(item["kind"], item["nursery_name"], item["subject_name"]) for item in body["items"]]


async def _get(http, **params):
    response = await http.get(URL, params=params)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] == len(body["items"])
    return body


async def test_liste_de_la_direction(http, world):
    await login(http, mail("direction-a"))
    body = await _get(http)
    # Sud a fini sa mise en route (personnel actif, tablette valable, pointage) ; Nord n'a plus de tablette valable.
    assert _summary(body) == [
        ("pin_locked", "Nord", "Camille Démo"),
        ("pin_locked", "Sud", "Camille Démo"),
        ("tablet_expired", "Nord", "Nord expirée"),
        ("departure_missing", "Nord", "Emma Démo"),
        ("departure_missing", "Nord", "Léo Démo"),
        ("tablet_expiring", "Sud", "Sud bientôt"),
        ("onboarding_incomplete", "Nord", "Nord"),
    ]
    items = {(item["kind"], item["nursery_name"], item["subject_name"]): item for item in body["items"]}
    pin = items["pin_locked", "Nord", "Camille Démo"]
    assert (pin["subject_id"], pin["since"], pin["day"]) == (str(world["camille"].id), "2026-11-20T08:00:00Z", None)
    leo = items["departure_missing", "Nord", "Léo Démo"]
    assert (leo["subject_id"], leo["day"], leo["since"]) == (str(world["leo"].id), "2026-11-19",
                                                             "2026-11-19T07:30:00Z")
    expired = items["tablet_expired", "Nord", "Nord expirée"]
    assert (expired["subject_id"], expired["since"]) == (str(world["tablets"]["expiree"].id), "2026-11-15T10:00:00Z")
    onboarding = items["onboarding_incomplete", "Nord", "Nord"]
    assert (onboarding["subject_id"], onboarding["since"]) == (str(world["nord"].id), "2026-09-01T08:00:00Z")


async def test_filtre_par_creche(http, world):
    await login(http, mail("direction-a"))
    body = await _get(http, nursery_id=str(world["sud"].id))
    assert _summary(body) == [("pin_locked", "Sud", "Camille Démo"), ("tablet_expiring", "Sud", "Sud bientôt")]


async def test_creche_fermee_rien_a_traiter(http, world):
    await login(http, mail("direction-a"))
    assert await _get(http, nursery_id=str(world["fermee"].id)) == {"items": [], "total": 0}


async def test_isolation_entre_entreprises(http, world):
    await login(http, mail("direction-b"))
    assert _summary(await _get(http)) == [
        ("pin_locked", "Témoin", "Autre Démo"),
        ("departure_missing", "Témoin", "Témoin Démo"),
        ("tablet_expiring", "Témoin", "Témoin bientôt"),
    ]
    response = await http.get(URL, params={"nursery_id": str(world["nord"].id)})
    assert response.status_code == 404
    assert response.json() == {"detail": "Crèche introuvable", "code": "nursery_not_found"}


async def test_deblocage_retire_l_element(http, world):
    await login(http, mail("direction-a"))
    response = await http.post(f"/api/v2/staff/{world['camille'].id}/pin/unlock")
    assert response.status_code == 204, response.text
    assert "pin_locked" not in {item["kind"] for item in (await _get(http))["items"]}


async def test_revocation_retire_la_tablette(http, world):
    await login(http, mail("direction-a"))
    tablet = world["tablets"]["bientot"]
    response = await http.delete(f"/api/v2/nurseries/{world['sud'].id}/tablets/{tablet.id}")
    assert response.status_code == 204, response.text
    assert "tablet_expiring" not in {item["kind"] for item in (await _get(http))["items"]}


@pytest.mark.parametrize(("now", "listed"), [
    # 22 h 59 UTC le 20 = 23 h 59 à Paris : l'arrivée du 20 est d'aujourd'hui.
    (datetime(2026, 11, 20, 22, 59, tzinfo=UTC), False),
    # 23 h 00 UTC le 20 = minuit le 21 à Paris : elle devient un départ non pointé.
    (datetime(2026, 11, 20, 23, 0, tzinfo=UTC), True),
])
async def test_jour_de_paris_autour_de_minuit(http, world, now, listed):
    _clock(now)
    await login(http, mail("direction-a"))
    body = await _get(http, nursery_id=str(world["sud"].id))
    assert (("departure_missing", "Sud", "Aujourd'hui Démo") in _summary(body)) is listed


async def test_arrivee_apres_minuit_a_paris_comptee_pour_ce_jour(http, world, db):
    # 23 h 15 UTC le 19 = 0 h 15 le 20 à Paris : jour du 20, pas un départ oublié de la veille.
    await _presence(db, world["nord"], "Minuit", date(2026, 11, 20), datetime(2026, 11, 19, 23, 15, tzinfo=UTC))
    await login(http, mail("direction-a"))
    assert "Minuit Démo" not in {item["subject_name"] for item in (await _get(http))["items"]}


async def test_direction_sans_creche(http, data):
    lonely = await data.enterprise("Groupe vide")
    await data.user(mail("direction-seule"), UserRole.OWNER, lonely)
    await login(http, mail("direction-seule"))
    assert await _get(http) == {"items": [], "total": 0}


async def test_employe_refuse(http, world):
    await login(http, mail("libre"))
    response = await http.get(URL)
    assert response.status_code == 403
    assert response.json()["code"] == "role_refused"


async def test_lecture_reduite_aux_creches_et_aux_fenetres(db, world):
    # Les règles revérifient tout ; le dépôt, lui, ne doit lire ni une autre crèche ni une tablette révoquée.
    repo = SqlToDoRepository(db)
    nord, sud = (NurseryRef(world[key].id, world[key].name) for key in ("nord", "sud"))
    tablets = await repo.tablets([nord, sud], *tablet_window(NOW))
    assert sorted(fact.label for fact in tablets) == ["Nord expirée", "Sud bientôt"]
    pins = await repo.locked_pins([sud])
    assert [(fact.nursery.name, fact.employee_name) for fact in pins] == [("Sud", "Camille Démo")]
    presences = await repo.open_presences([nord], *departure_window(date(2026, 11, 20)))
    assert sorted(fact.child_name for fact in presences) == ["Emma Démo", "Léo Démo"]
