"""Enfants, familles et responsables sur PostgreSQL (LUN-009)."""

import uuid

import pytest
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.exc import IntegrityError

from app.auth.models import UserRole
from app.children.models import ChildGuardian, Relationship
from tests.integration.conftest import login

pytestmark = pytest.mark.anyio


@pytest.fixture
async def world(data):
    a, b = await data.enterprise("Groupe A"), await data.enterprise("Groupe B")
    w = {"nord": await data.nursery(a, "Crèche Nord"), "sud": await data.nursery(a, "Crèche Sud"),
         "temoin": await data.nursery(b, "Crèche Témoin"),
         "owner": await data.user("direction@a.test", UserRole.OWNER, a),
         "employee": await data.user("employe@a.test", UserRole.EMPLOYEE, a),
         "owner_b": await data.user("direction@b.test", UserRole.OWNER, b)}
    await data.grant(w["employee"], w["nord"])
    return w


async def owner_client(clients, email="direction@a.test"):
    client = clients()
    assert (await login(client, email)).status_code == 200
    return client


async def make_family(client, nursery, label="Famille Garnier", children=1, guardians=1):
    base = f"/api/v2/nurseries/{nursery.id}"
    family = (await client.post(f"{base}/families", json={"label": label, "city": "Toulouse"})).json()
    kids = [(await client.post(f"{base}/families/{family['id']}/children", json={
        "first_name": f"Enfant{i}", "last_name": label.split()[-1], "birth_date": "2024-03-12",
        "enrollment_date": "2025-09-01"})).json() for i in range(children)]
    adults = [(await client.post(f"{base}/families/{family['id']}/guardians", json={
        "first_name": f"Parent{i}", "last_name": label.split()[-1], "email": f"Parent{i}@Famille.TEST"})).json()
        for i in range(guardians)]
    return family, kids, adults


# --- Parcours de la direction --------------------------------------------------

async def test_la_direction_cree_une_famille_complete(clients, world):
    client = await owner_client(clients)
    family, (child,), (alice, karim) = await make_family(client, world["nord"], guardians=2)
    assert child["status"] == "adaptation" and child["exit_date"] is None
    assert alice["email"] == "parent0@famille.test" and alice["has_account"] is False

    base = f"/api/v2/nurseries/{world['nord'].id}/children/{child['id']}/guardians"
    assert (await client.put(f"{base}/{alice['id']}", json={
        "relationship": "parent", "has_parental_authority": True, "is_authorized_pickup": True})).status_code == 204
    assert (await client.put(f"{base}/{karim['id']}", json={"relationship": "other"})).status_code == 204
    # Mise à jour d'un lien existant : pas de doublon.
    assert (await client.put(f"{base}/{karim['id']}", json={
        "relationship": "other", "is_authorized_pickup": True})).status_code == 204

    detail = (await client.get(f"/api/v2/nurseries/{world['nord'].id}/children/{child['id']}")).json()
    links = {link["guardian"]["first_name"]: link for link in detail["guardians"]}
    assert links["Parent0"]["has_parental_authority"] is True
    assert links["Parent1"] | {"guardian": None} == {"guardian": None, "relationship": "other",
                                                    "has_parental_authority": False, "is_authorized_pickup": True,
                                                    "is_emergency_contact": False}

    fam = (await client.get(f"/api/v2/nurseries/{world['nord'].id}/families/{family['id']}")).json()
    assert len(fam["children"]) == 1 and len(fam["guardians"]) == 2

    assert (await client.delete(f"{base}/{karim['id']}")).status_code == 204
    detail = (await client.get(f"/api/v2/nurseries/{world['nord'].id}/children/{child['id']}")).json()
    assert [link["guardian"]["first_name"] for link in detail["guardians"]] == ["Parent0"]


async def test_l_employe_lit_mais_ne_modifie_pas(clients, world):
    owner = await owner_client(clients)
    family, (child,), _ = await make_family(owner, world["nord"])
    employee = await owner_client(clients, "employe@a.test")
    base = f"/api/v2/nurseries/{world['nord'].id}"
    assert [c["id"] for c in (await employee.get(f"{base}/children")).json()] == [child["id"]]
    assert (await employee.get(f"{base}/children/{child['id']}")).status_code == 200
    assert (await employee.get(f"{base}/families/{family['id']}")).status_code == 200
    assert (await employee.post(f"{base}/families", json={"label": "x"})).status_code == 403
    assert (await employee.patch(f"{base}/children/{child['id']}", json={"first_name": "x"})).status_code == 403


# --- Isolation ------------------------------------------------------------------

async def test_isolation_entre_creches_et_entreprises(clients, world):
    owner = await owner_client(clients)
    _, (child_sud,), (guardian_sud,) = await make_family(owner, world["sud"], "Famille Roux")
    nord, sud = f"/api/v2/nurseries/{world['nord'].id}", f"/api/v2/nurseries/{world['sud'].id}"
    # Même direction, mauvaise crèche dans l'URL : introuvable.
    assert (await owner.get(f"{nord}/children/{child_sud['id']}")).status_code == 404
    assert (await owner.patch(f"{nord}/guardians/{guardian_sud['id']}", json={"phone": "x"})).status_code == 404
    # Employé sans accès à Sud, autre entreprise : introuvable.
    employee = await owner_client(clients, "employe@a.test")
    assert (await employee.get(f"{sud}/children/{child_sud['id']}")).status_code == 404
    other = await owner_client(clients, "direction@b.test")
    assert (await other.get(f"{sud}/children/{child_sud['id']}")).status_code == 404
    assert (await other.get(f"{sud}/children")).status_code == 404
    assert (await other.get(f"/api/v2/nurseries/{world['temoin'].id}/children")).json() == []


async def test_un_responsable_ne_se_relie_qu_aux_enfants_de_sa_famille(clients, world):
    owner = await owner_client(clients)
    _, (child,), _ = await make_family(owner, world["nord"], "Famille Garnier")
    _, _, (stranger,) = await make_family(owner, world["nord"], "Famille Lambert", children=0)
    _, _, (elsewhere,) = await make_family(owner, world["sud"], "Famille Roux", children=0)
    base = f"/api/v2/nurseries/{world['nord'].id}/children/{child['id']}/guardians"
    assert (await owner.put(f"{base}/{stranger['id']}", json={"relationship": "parent"})).status_code == 422
    assert (await owner.put(f"{base}/{elsewhere['id']}", json={"relationship": "parent"})).status_code == 404


async def test_la_base_refuse_un_lien_entre_deux_familles(clients, world, db):
    owner = await owner_client(clients)
    _, (child,), _ = await make_family(owner, world["nord"], "Famille Garnier")
    family_b, _, (stranger,) = await make_family(owner, world["nord"], "Famille Lambert", children=0)
    for declared in (child["family_id"], family_b["id"]):
        with pytest.raises(IntegrityError, match="fk_child_guardian_"):
            async with db.begin_nested():
                db.add(ChildGuardian(child_id=uuid.UUID(child["id"]), guardian_id=uuid.UUID(stranger["id"]),
                                     family_id=uuid.UUID(declared), relationship=Relationship.PARENT))
                await db.flush()


# --- Dates et statuts -------------------------------------------------------------

@pytest.mark.parametrize("body", [
    {"birth_date": "2025-01-10", "enrollment_date": "2024-09-01"},
    {"birth_date": "2024-01-10", "enrollment_date": "2025-09-01", "status": "departed"},
    {"birth_date": "2024-01-10"},
])
async def test_creation_d_un_enfant_invalide(clients, world, body):
    owner = await owner_client(clients)
    family, _, _ = await make_family(owner, world["nord"], children=0, guardians=0)
    url = f"/api/v2/nurseries/{world['nord'].id}/families/{family['id']}/children"
    response = await owner.post(url, json={"first_name": "Léo", "last_name": "Garnier"} | body)
    assert response.status_code == 422


async def test_depart_puis_reinscription(clients, world):
    owner = await owner_client(clients)
    _, (child,), _ = await make_family(owner, world["nord"])
    base = f"/api/v2/nurseries/{world['nord'].id}/children"
    url = f"{base}/{child['id']}"
    assert (await owner.patch(url, json={"status": "departed"})).status_code == 422
    assert (await owner.patch(url, json={"status": "departed", "exit_date": "2025-08-01"})).status_code == 422
    response = await owner.patch(url, json={"status": "departed", "exit_date": "2026-07-03"})
    assert response.status_code == 200 and response.json()["exit_date"] == "2026-07-03"
    assert (await owner.get(base)).json() == []
    assert [c["id"] for c in (await owner.get(base, params={"status": "departed"})).json()] == [child["id"]]
    response = await owner.patch(url, json={"status": "active"})
    assert response.json()["status"] == "active" and response.json()["exit_date"] is None
    assert (await owner.patch(url, json={"first_name": None})).status_code == 422


# --- Minimisation ----------------------------------------------------------------

async def test_aucune_donnee_de_sante_ni_superflue_dans_les_fiches(db):
    """Verrou de minimisation (RGPD) : santé (LUN-019), genre et photo ne sont pas stockés à ce stade."""
    connection = await db.connection()
    columns = await connection.run_sync(lambda sync: {
        table: {column["name"] for column in sa_inspect(sync).get_columns(table)} for table in ("child", "guardian")})
    forbidden = {"allergies", "medical_notes", "dietary_restrictions", "has_pai", "gender", "photo_url", "profession",
                 "employer"}
    assert columns["child"].isdisjoint(forbidden) and columns["guardian"].isdisjoint(forbidden)
