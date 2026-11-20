"""Mise en route sur PostgreSQL (LUN-128) : succès réels, dates, succès perdus et isolation."""

import os
import uuid
from datetime import UTC, date, datetime, timedelta

import pytest

from app.attendance.models import Attendance
from app.auth.dependencies import get_now
from app.auth.models import UserRole
from app.children.models import Child, ChildStatus, Family
from app.main import app
from app.nurseries.models import NurseryAccess
from app.tablets.models import TabletDevice
from tests.integration.conftest import login

pytestmark = pytest.mark.anyio
NOW = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)
NOV_3 = datetime(2026, 11, 3, 9, 0, tzinfo=UTC)
NOV_10 = datetime(2026, 11, 10, 9, 0, tzinfo=UTC)


@pytest.fixture(autouse=True)
def clock():
    async def get_clock():
        return NOW

    app.dependency_overrides[get_now] = get_clock


@pytest.fixture
async def world(data, db):
    a, b = await data.enterprise("Groupe A"), await data.enterprise("Groupe B")
    nord = await data.nursery(a, "Nord")
    sud = await data.nursery(a, "Sud")
    other = await data.nursery(b, "Témoin")
    owner = await data.user("direction@a.test", UserRole.OWNER, a)
    helene = await data.user("helene@a.test", UserRole.EMPLOYEE, a)
    lea = await data.user("lea@a.test", UserRole.EMPLOYEE, a)
    await data.user("direction@b.test", UserRole.OWNER, b)
    other_staff = await data.user("employe@b.test", UserRole.EMPLOYEE, b)
    for user, nursery in ((helene, nord), (lea, nord), (owner, sud), (other_staff, other)):
        await data.grant(user, nursery)
    # Accès accordés le 3 et le 10 novembre ; l'accès de la direction à « Sud » ne compte pas : ce n'est pas un employé.
    for user, granted_at in ((helene, NOV_10), (lea, NOV_3)):
        (await db.get(NurseryAccess, (user.id, nord.id))).granted_at = granted_at
    tablet = TabletDevice(id=uuid.uuid4(), nursery_id=nord.id, enterprise_id=a.id, label="Entrée",
                          token_digest=os.urandom(32), created_at=NOV_10, expires_at=NOW + timedelta(days=80))
    # Les autres crèches ont tablette et pointage : rien ne doit déborder sur « Nord ».
    db.add_all([tablet, TabletDevice(id=uuid.uuid4(), nursery_id=other.id, enterprise_id=b.id, label="Témoin",
                                     token_digest=os.urandom(32), created_at=NOV_3,
                                     expires_at=NOW + timedelta(days=80))])
    await db.flush()
    for nursery in (sud, other):
        await _arrival(db, nursery, NOV_3)
    return {"nord": nord, "sud": sud, "other": other, "lea": lea, "helene": helene, "tablet": tablet}


async def _arrival(db, nursery, arrived_at: datetime) -> None:
    family = Family(id=uuid.uuid4(), nursery_id=nursery.id, label="Famille Démo", is_active=True)
    db.add(family)
    await db.flush()
    kid = Child(id=uuid.uuid4(), nursery_id=nursery.id, family_id=family.id, first_name="Enfant", last_name="Démo",
                birth_date=date(2024, 1, 1), enrollment_date=date(2025, 9, 1), status=ChildStatus.ACTIVE)
    db.add(kid)
    await db.flush()
    db.add(Attendance(id=uuid.uuid4(), child_id=kid.id, nursery_id=nursery.id, day=arrived_at.date(),
                      arrived_at=arrived_at, departed_at=arrived_at + timedelta(hours=8)))
    await db.flush()


async def _steps(http, nursery) -> dict:
    response = await http.get(f"/api/v2/nurseries/{nursery.id}/onboarding")
    assert response.status_code == 200, response.text
    return {step["milestone"]: step["achieved_at"] for step in response.json()["steps"]}


async def test_deux_succes_sur_trois_dates_par_la_plus_ancienne_preuve(http, world):
    await login(http, "direction@a.test")
    assert await _steps(http, world["nord"]) == {
        "staff": "2026-11-03T09:00:00Z",
        "tablet": "2026-11-10T09:00:00Z",
        "first_attendance": None,
    }


async def test_premier_pointage_date_de_la_plus_ancienne_arrivee(http, world, db):
    await _arrival(db, world["nord"], datetime(2026, 11, 18, 7, 45, tzinfo=UTC))
    await _arrival(db, world["nord"], datetime(2026, 11, 17, 8, 15, tzinfo=UTC))
    await login(http, "direction@a.test")
    assert (await _steps(http, world["nord"]))["first_attendance"] == "2026-11-17T08:15:00Z"


async def test_succes_perdu_quand_la_seule_tablette_est_revoquee(http, world):
    await login(http, "direction@a.test")
    response = await http.delete(f"/api/v2/nurseries/{world['nord'].id}/tablets/{world['tablet'].id}")
    assert response.status_code == 204, response.text
    assert (await _steps(http, world["nord"]))["tablet"] is None


async def test_succes_perdu_quand_les_employees_ayant_acces_partent(http, world):
    await login(http, "direction@a.test")
    # Léa (accès du 3) part : la date passe à l'accès d'Hélène (le 10).
    response = await http.patch(f"/api/v2/staff/{world['lea'].id}", json={"is_active": False})
    assert response.status_code == 200, response.text
    assert (await _steps(http, world["nord"]))["staff"] == "2026-11-10T09:00:00Z"
    response = await http.patch(f"/api/v2/staff/{world['helene'].id}", json={"is_active": False})
    assert response.status_code == 200, response.text
    assert (await _steps(http, world["nord"]))["staff"] is None


async def test_acces_de_la_direction_ne_compte_pas_comme_personnel(http, world):
    await login(http, "direction@a.test")
    assert await _steps(http, world["sud"]) == {
        "staff": None, "tablet": None, "first_attendance": "2026-11-03T09:00:00Z"}


async def test_employe_ayant_acces_refuse(http, world):
    await login(http, "helene@a.test")
    response = await http.get(f"/api/v2/nurseries/{world['nord'].id}/onboarding")
    assert response.status_code == 403
    assert response.json() == {"detail": "Seule la direction peut gérer cette crèche", "code": "manager_required"}


@pytest.mark.parametrize(("email", "key"), [
    ("helene@a.test", "sud"),
    ("direction@a.test", "other"),
    ("direction@b.test", "nord"),
])
async def test_creche_sans_acces_ou_d_une_autre_entreprise_introuvable(http, world, email, key):
    await login(http, email)
    response = await http.get(f"/api/v2/nurseries/{world[key].id}/onboarding")
    missing = await http.get(f"/api/v2/nurseries/{uuid.uuid4()}/onboarding")
    assert response.status_code == missing.status_code == 404
    assert response.json() == missing.json() == {"detail": "Crèche introuvable", "code": "nursery_not_found"}
