"""Routes des crèches : parcours de la direction et cas négatifs entre crèches et entreprises (C2.2.3)."""

import uuid

import pytest

from tests.auth.conftest import ORIGIN


def ids(response):
    return {item["id"] for item in response.json()}


# --- Liste ---------------------------------------------------------------------

def test_direction_voit_les_creches_actives_de_son_entreprise(as_user, world):
    response = as_user("owner_a").get("/api/v2/nurseries")
    assert response.status_code == 200
    assert ids(response) == {str(world.nurseries["nord"].id), str(world.nurseries["sud"].id)}


def test_direction_peut_inclure_les_creches_fermees(as_user, world):
    response = as_user("owner_a").get("/api/v2/nurseries", params={"include_inactive": True})
    assert str(world.nurseries["fermee"].id) in ids(response)


def test_employe_ne_voit_que_les_creches_accordees_et_actives(as_user, world):
    assert ids(as_user("employee_nord").get("/api/v2/nurseries")) == {str(world.nurseries["nord"].id)}


def test_employe_sans_acces_voit_une_liste_vide(as_user):
    response = as_user("employee_none").get("/api/v2/nurseries")
    assert response.status_code == 200 and response.json() == []


def test_l_autre_entreprise_ne_voit_que_ses_creches(as_user, world):
    assert ids(as_user("owner_b").get("/api/v2/nurseries")) == {str(world.nurseries["temoin"].id)}


@pytest.mark.parametrize("key", ["developer", "guardian"])
def test_editeur_et_famille_n_ont_pas_acces_aux_creches(as_user, key):
    assert as_user(key).get("/api/v2/nurseries").status_code == 403


def test_liste_sans_session_refusee(as_user):
    as_user("owner_a")  # installe les dépôts de test
    from fastapi.testclient import TestClient

    from app.main import app

    assert TestClient(app, base_url="https://testserver").get("/api/v2/nurseries").status_code == 401


# --- Matrice d'isolation : lecture d'une crèche --------------------------------

@pytest.mark.parametrize(("key", "nursery", "expected"), [
    ("owner_a", "nord", 200),
    ("owner_a", "fermee", 200),
    ("owner_a", "temoin", 404),
    ("employee_nord", "nord", 200),
    ("employee_nord", "sud", 404),
    ("employee_nord", "fermee", 404),
    ("employee_nord", "temoin", 404),
    ("employee_none", "nord", 404),
    ("owner_b", "nord", 404),
    ("employee_b", "nord", 404),
    ("developer", "nord", 403),
    ("guardian", "nord", 403),
])
def test_lecture_d_une_creche(as_user, world, key, nursery, expected):
    assert as_user(key).get(f"/api/v2/nurseries/{world.nurseries[nursery].id}").status_code == expected


def test_creche_inexistante_et_creche_d_une_autre_entreprise_meme_reponse(as_user, world):
    client = as_user("owner_a")
    other = client.get(f"/api/v2/nurseries/{world.nurseries['temoin'].id}")
    missing = client.get(f"/api/v2/nurseries/{uuid.uuid4()}")
    assert other.status_code == missing.status_code == 404
    assert other.json() == missing.json()


def test_identifiant_mal_forme_refuse(as_user):
    assert as_user("owner_a").get("/api/v2/nurseries/1 OR 1=1").status_code == 422


# --- Création et modification ---------------------------------------------------

NEW = {"name": "Crèche des Lilas", "city": "Escalquens", "postal_code": "31750", "capacity": 12}


def test_direction_cree_une_creche_dans_son_entreprise(as_user, world):
    client = as_user("owner_a")
    response = client.post("/api/v2/nurseries", json=NEW, headers=ORIGIN)
    assert response.status_code == 201
    created = response.json()
    assert created["enterprise_id"] == str(world.enterprise_a) and created["is_active"] is True
    assert client.get(f"/api/v2/nurseries/{created['id']}").status_code == 200
    assert as_user("owner_b").get(f"/api/v2/nurseries/{created['id']}").status_code == 404


def test_l_entreprise_vient_de_la_session_pas_de_la_requete(as_user, world):
    response = as_user("owner_a").post("/api/v2/nurseries", json=NEW | {"enterprise_id": str(world.enterprise_b)},
                                       headers=ORIGIN)
    assert response.json()["enterprise_id"] == str(world.enterprise_a)


@pytest.mark.parametrize("key", ["employee_nord", "developer", "guardian"])
def test_seule_la_direction_cree_une_creche(as_user, key):
    assert as_user(key).post("/api/v2/nurseries", json=NEW, headers=ORIGIN).status_code == 403


@pytest.mark.parametrize("body", [
    NEW | {"capacity": 0}, NEW | {"capacity": 1001}, NEW | {"name": ""}, {"city": "Toulouse", "capacity": 10},
])
def test_creation_invalide(as_user, body):
    assert as_user("owner_a").post("/api/v2/nurseries", json=body, headers=ORIGIN).status_code == 422


def test_creation_sans_origin_refusee(as_user):
    assert as_user("owner_a").post("/api/v2/nurseries", json=NEW).status_code == 403


def test_direction_modifie_et_ferme_une_creche(as_user, world):
    owner, employee = as_user("owner_a"), as_user("employee_nord")
    nord = world.nurseries["nord"].id
    response = owner.patch(f"/api/v2/nurseries/{nord}", json={"capacity": 32, "is_active": False}, headers=ORIGIN)
    assert response.status_code == 200 and response.json()["capacity"] == 32
    # Fermée : l'employé la perd immédiatement, la direction la garde.
    assert employee.get(f"/api/v2/nurseries/{nord}").status_code == 404
    assert owner.get(f"/api/v2/nurseries/{nord}").status_code == 200


@pytest.mark.parametrize(("key", "expected"), [("employee_nord", 403), ("owner_b", 404)])
def test_modification_refusee(as_user, world, key, expected):
    response = as_user(key).patch(f"/api/v2/nurseries/{world.nurseries['nord'].id}", json={"capacity": 1},
                                  headers=ORIGIN)
    assert response.status_code == expected
    assert world.nurseries["nord"].capacity == 12


@pytest.mark.parametrize("field", ["name", "city", "capacity", "is_active"])
def test_champ_obligatoire_non_videable(as_user, world, field):
    response = as_user("owner_a").patch(f"/api/v2/nurseries/{world.nurseries['nord'].id}", json={field: None},
                                        headers=ORIGIN)
    assert response.status_code == 422


# --- Accès du personnel -------------------------------------------------------

def test_direction_accorde_puis_retire_un_acces(as_user, world):
    owner, employee = as_user("owner_a"), as_user("employee_none")
    nord, target = world.nurseries["nord"].id, world.users["employee_none"].id
    assert employee.get(f"/api/v2/nurseries/{nord}").status_code == 404

    assert owner.put(f"/api/v2/nurseries/{nord}/staff/{target}", headers=ORIGIN).status_code == 204
    assert employee.get(f"/api/v2/nurseries/{nord}").status_code == 200
    staff = owner.get(f"/api/v2/nurseries/{nord}/staff").json()
    assert {member["id"] for member in staff} == {str(world.users["employee_nord"].id), str(target)}
    assert world.repo.accesses[(target, nord)].granted_by == world.users["owner_a"].id

    assert owner.delete(f"/api/v2/nurseries/{nord}/staff/{target}", headers=ORIGIN).status_code == 204
    # Effet immédiat, sans reconnexion : l'accès est vérifié à chaque requête.
    assert employee.get(f"/api/v2/nurseries/{nord}").status_code == 404


def test_accorder_deux_fois_est_sans_effet(as_user, world):
    owner = as_user("owner_a")
    url = f"/api/v2/nurseries/{world.nurseries['nord'].id}/staff/{world.users['employee_nord'].id}"
    assert owner.put(url, headers=ORIGIN).status_code == 204
    assert len([key for key in world.repo.accesses if key[0] == world.users["employee_nord"].id]) == 2


@pytest.mark.parametrize("target", ["employee_b", "owner_a", "developer", "guardian"])
def test_on_n_accorde_l_acces_qu_a_un_employe_de_l_entreprise(as_user, world, target):
    url = f"/api/v2/nurseries/{world.nurseries['nord'].id}/staff/{world.users[target].id}"
    assert as_user("owner_a").put(url, headers=ORIGIN).status_code == 404


def test_un_employe_ne_peut_pas_s_accorder_un_acces(as_user, world):
    url = f"/api/v2/nurseries/{world.nurseries['nord'].id}/staff/{world.users['employee_sud'].id}"
    assert as_user("employee_nord").put(url, headers=ORIGIN).status_code == 403
    url = f"/api/v2/nurseries/{world.nurseries['sud'].id}/staff/{world.users['employee_nord'].id}"
    assert as_user("employee_nord").put(url, headers=ORIGIN).status_code == 404


def test_l_autre_entreprise_ne_gere_pas_le_personnel(as_user, world):
    nord = world.nurseries["nord"].id
    client = as_user("owner_b")
    assert client.get(f"/api/v2/nurseries/{nord}/staff").status_code == 404
    assert client.delete(f"/api/v2/nurseries/{nord}/staff/{world.users['employee_nord'].id}",
                         headers=ORIGIN).status_code == 404
    assert (world.users["employee_nord"].id, nord) in world.repo.accesses


def test_liste_du_personnel_de_l_entreprise(as_user, world):
    response = as_user("owner_a").get("/api/v2/staff")
    assert response.status_code == 200
    by_id = {member["id"]: member for member in response.json()}
    assert set(by_id) == {str(world.users[key].id) for key in ("employee_nord", "employee_sud", "employee_none")}
    assert set(by_id[str(world.users["employee_nord"].id)]["nursery_ids"]) == {
        str(world.nurseries["nord"].id), str(world.nurseries["fermee"].id)}
    assert "password_hash" not in by_id[str(world.users["employee_nord"].id)]


@pytest.mark.parametrize("key", ["employee_nord", "developer"])
def test_liste_du_personnel_reservee_a_la_direction(as_user, key):
    assert as_user(key).get("/api/v2/staff").status_code == 403


def test_me_indique_l_entreprise(as_user, world):
    assert as_user("employee_nord").get("/api/v2/auth/me").json()["enterprise_id"] == str(world.enterprise_a)


# --- Second facteur (ADR-004) ----------------------------------------------------

@pytest.mark.parametrize("key", ["owner_a", "developer"])
def test_routes_metier_fermees_tant_que_le_second_facteur_manque(as_user, world, key):
    client = as_user(key, complete_mfa=False)
    assert client.get("/api/v2/auth/me").json()["mfa"] == "setup_required"
    response = client.get("/api/v2/nurseries")
    assert response.status_code == 403
    assert response.json() == {"detail": "Second facteur requis"}
    response = client.post("/api/v2/nurseries", json={"name": "Nouvelle", "city": "Albi", "capacity": 10},
                           headers=ORIGIN)
    assert response.status_code == 403
    assert len(world.repo.nurseries) == 4


def test_employe_sans_facteur_n_a_rien_a_presenter(as_user):
    client = as_user("employee_nord", complete_mfa=False)
    assert client.get("/api/v2/auth/me").json()["mfa"] == "not_required"
    assert client.get("/api/v2/nurseries").status_code == 200


def test_employe_qui_a_active_un_facteur_doit_le_presenter(as_user, world):
    world.auth.with_factor.add(world.users["employee_nord"].id)
    client = as_user("employee_nord", complete_mfa=False)
    assert client.get("/api/v2/auth/me").json()["mfa"] == "required"
    assert client.get("/api/v2/nurseries").status_code == 403
