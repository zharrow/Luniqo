"""Crèches et accès sur PostgreSQL : requêtes SQL du dépôt et isolation de bout en bout."""

import pytest
from sqlalchemy import func, select

from app.auth.models import UserRole
from app.nurseries.models import Nursery, NurseryAccess
from tests.integration.conftest import login

pytestmark = pytest.mark.anyio


@pytest.fixture
async def world(data):
    a, b = await data.enterprise("Groupe A"), await data.enterprise("Groupe B")
    w = {
        "a": a, "b": b,
        "nord": await data.nursery(a, "Crèche Nord"),
        "sud": await data.nursery(a, "Crèche Sud"),
        "fermee": await data.nursery(a, "Crèche Fermée", active=False),
        "temoin": await data.nursery(b, "Crèche Témoin"),
        "owner_a": await data.user("direction@a.test", UserRole.OWNER, a),
        "employee": await data.user("employe@a.test", UserRole.EMPLOYEE, a),
        "other_employee": await data.user("autre@a.test", UserRole.EMPLOYEE, a),
        "owner_b": await data.user("direction@b.test", UserRole.OWNER, b),
    }
    await data.grant(w["employee"], w["nord"])
    await data.grant(w["employee"], w["fermee"])
    return w


def names(response):
    return sorted(n["name"] for n in response.json())


async def test_listes_selon_le_role(http, world):
    await login(http, "direction@a.test")
    assert names(await http.get("/api/v2/nurseries")) == ["Crèche Nord", "Crèche Sud"]
    assert names(await http.get("/api/v2/nurseries", params={"include_inactive": "true"})) == [
        "Crèche Fermée", "Crèche Nord", "Crèche Sud"]
    http.cookies.clear()
    await login(http, "employe@a.test")
    assert names(await http.get("/api/v2/nurseries")) == ["Crèche Nord"]
    http.cookies.clear()
    await login(http, "direction@b.test")
    assert names(await http.get("/api/v2/nurseries")) == ["Crèche Témoin"]


@pytest.mark.parametrize(("email", "nursery", "expected"), [
    ("direction@a.test", "fermee", 200),
    ("direction@a.test", "temoin", 404),
    ("employe@a.test", "nord", 200),
    ("employe@a.test", "sud", 404),
    ("employe@a.test", "fermee", 404),
    ("autre@a.test", "nord", 404),
    ("direction@b.test", "nord", 404),
])
async def test_isolation(http, world, email, nursery, expected):
    await login(http, email)
    assert (await http.get(f"/api/v2/nurseries/{world[nursery].id}")).status_code == expected


async def test_creation_persistee_dans_l_entreprise_de_la_session(http, world, db):
    await login(http, "direction@a.test")
    response = await http.post("/api/v2/nurseries", json={"name": "Crèche des Lilas", "city": "Escalquens",
                                                          "capacity": 12, "enterprise_id": str(world["b"].id)})
    assert response.status_code == 201
    created = await db.get(Nursery, response.json()["id"])
    assert created.enterprise_id == world["a"].id and created.is_active


async def test_acces_accorde_retire_et_idempotent(http, world, db):
    await login(http, "direction@a.test")
    url = f"/api/v2/nurseries/{world['sud'].id}/staff/{world['other_employee'].id}"
    assert (await http.put(url)).status_code == 204
    assert (await http.put(url)).status_code == 204  # pas de violation de clé primaire
    access = await db.get(NurseryAccess, (world["other_employee"].id, world["sud"].id))
    assert access.granted_by == world["owner_a"].id and access.enterprise_id == world["a"].id

    staff = await http.get(f"/api/v2/nurseries/{world['sud'].id}/staff")
    assert [member["email"] for member in staff.json()] == ["autre@a.test"]
    employees = {e["email"]: e for e in (await http.get("/api/v2/staff")).json()}
    assert set(employees) == {"employe@a.test", "autre@a.test"}
    assert set(employees["employe@a.test"]["nursery_ids"]) == {str(world["nord"].id), str(world["fermee"].id)}

    assert (await http.delete(url)).status_code == 204
    assert (await http.delete(url)).status_code == 204
    count = await db.scalar(select(func.count()).select_from(NurseryAccess).where(
        NurseryAccess.user_id == world["other_employee"].id))
    assert count == 0


async def test_l_autre_entreprise_ne_touche_pas_aux_acces(http, world, db):
    await login(http, "direction@b.test")
    url = f"/api/v2/nurseries/{world['nord'].id}/staff/{world['employee'].id}"
    assert (await http.delete(url)).status_code == 404
    assert await db.get(NurseryAccess, (world["employee"].id, world["nord"].id)) is not None
    # Tentative d'accorder à un employé de l'entreprise A l'accès à sa propre crèche : employé introuvable.
    url = f"/api/v2/nurseries/{world['temoin'].id}/staff/{world['employee'].id}"
    assert (await http.put(url)).status_code == 404


async def test_modification_et_fermeture(http, world, db):
    await login(http, "direction@a.test")
    response = await http.patch(f"/api/v2/nurseries/{world['nord'].id}", json={"capacity": 30, "is_active": False})
    assert response.status_code == 200
    stored = await db.get(Nursery, world["nord"].id)
    assert (stored.capacity, stored.is_active) == (30, False)
    http.cookies.clear()
    await login(http, "employe@a.test")
    assert (await http.get(f"/api/v2/nurseries/{world['nord'].id}")).status_code == 404
