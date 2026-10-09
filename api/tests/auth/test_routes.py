import hashlib

import pytest

from app.auth.models import AuthEventType
from app.auth.service import Client, revoke_all_sessions
from tests.auth.conftest import ORIGIN, PASSWORD, login

COOKIE = "__Host-luniqo_session"


# --- Connexion ---------------------------------------------------------------

def test_connexion_reussie_pose_un_cookie_de_session_durci(client, repo):
    response = login(client)
    assert response.status_code == 200
    assert response.json()["email"] == "direction@demo.test"
    assert response.json()["role"] == "owner"
    # Direction sans facteur enregistré : elle doit en enregistrer un (ADR-004).
    assert response.json()["mfa"] == "setup_required"
    assert "password_hash" not in response.json()
    set_cookie = response.headers["set-cookie"]
    assert set_cookie.startswith(f"{COOKIE}=")
    for attribute in ("HttpOnly", "Secure", "SameSite=lax", "Path=/"):
        assert attribute in set_cookie
    assert "Max-Age" not in set_cookie and "Domain" not in set_cookie
    assert response.headers["cache-control"] == "no-store"
    assert len(repo.events_of(AuthEventType.LOGIN_SUCCEEDED)) == 1


def test_seule_l_empreinte_du_jeton_est_stockee(client, repo):
    login(client)
    token = client.cookies[COOKIE]
    assert len(token) >= 43  # 256 bits en base64
    (stored,) = repo.sessions.values()
    assert stored.token_digest == hashlib.sha256(token.encode()).digest()
    assert token.encode() not in stored.token_digest


def test_adresse_insensible_a_la_casse_et_aux_espaces(client):
    assert login(client, email="  Direction@Demo.TEST ").status_code == 200


@pytest.mark.parametrize(("email", "password", "detail"), [
    ("direction@demo.test", "mauvaise phrase de passe", "bad_password"),
    ("inconnu@demo.test", PASSWORD, "unknown_account"),
])
def test_echec_de_connexion_meme_reponse_que_le_compte_existe_ou_non(client, repo, email, password, detail):
    response = login(client, email=email, password=password)
    assert response.status_code == 401
    assert response.json() == {"detail": "Identifiants invalides"}
    assert "set-cookie" not in response.headers
    (event,) = repo.events_of(AuthEventType.LOGIN_FAILED)
    assert event.detail == detail and event.email == email


def test_compte_desactive_refuse_avec_la_meme_reponse(client, repo):
    repo.users["direction@demo.test"].is_active = False
    response = login(client)
    assert response.status_code == 401
    assert response.json() == {"detail": "Identifiants invalides"}
    assert repo.events_of(AuthEventType.LOGIN_FAILED)[0].detail == "inactive_account"


def test_nouvelle_connexion_remplace_la_session_du_navigateur(client, repo):
    login(client)
    first = client.cookies[COOKIE]
    login(client)
    assert client.cookies[COOKIE] != first
    assert len(repo.sessions) == 1


def test_journal_sans_mot_de_passe_ni_jeton(client, repo):
    login(client)
    login(client, password="mauvaise phrase de passe")
    token = client.cookies[COOKIE]
    for event in repo.events:
        values = " ".join(str(value) for value in vars(event).values())
        assert PASSWORD not in values and "mauvaise phrase" not in values and token not in values


# --- Session -----------------------------------------------------------------

def test_me_sans_session_refuse(client):
    assert client.get("/api/v2/auth/me").status_code == 401


def test_me_avec_un_jeton_inconnu_refuse(client):
    client.cookies.set(COOKIE, "jeton-invente")
    assert client.get("/api/v2/auth/me").status_code == 401


def test_me_renvoie_l_utilisateur_de_la_session(client):
    login(client)
    response = client.get("/api/v2/auth/me")
    assert response.status_code == 200
    assert response.json()["first_name"] == "Camille"
    assert response.headers["cache-control"] == "no-store"


def test_me_ouvert_a_une_session_en_attente_du_second_facteur(client, repo):
    repo.with_factor.add(repo.users["direction@demo.test"].id)
    assert login(client).json()["mfa"] == "required"
    (stored,) = repo.sessions.values()
    assert stored.mfa_required and stored.mfa_verified_at is None
    assert client.get("/api/v2/auth/me").json()["mfa"] == "required"


def test_me_indique_un_second_facteur_presente(client, repo, clock):
    login(client)
    repo.complete_second_factor(hashlib.sha256(client.cookies[COOKIE].encode()).digest(), clock.now)
    assert client.get("/api/v2/auth/me").json()["mfa"] == "verified"


def test_session_prolongee_par_l_activite(client, repo, clock):
    login(client)
    clock.advance(minutes=20)
    assert client.get("/api/v2/auth/me").status_code == 200
    (stored,) = repo.sessions.values()
    assert stored.last_seen_at == clock.now
    clock.advance(minutes=20)
    assert client.get("/api/v2/auth/me").status_code == 200


def test_session_expiree_apres_30_minutes_d_inactivite(client, repo, clock):
    login(client)
    clock.advance(minutes=30)
    assert client.get("/api/v2/auth/me").status_code == 401
    assert repo.sessions == {}
    assert len(repo.events_of(AuthEventType.SESSION_EXPIRED)) == 1


def test_session_expiree_apres_12_heures_meme_active(client, clock):
    login(client)
    for _ in range(35):  # une requête toutes les 20 minutes pendant 11 h 40
        clock.advance(minutes=20)
        assert client.get("/api/v2/auth/me").status_code == 200
    clock.advance(minutes=20)
    assert client.get("/api/v2/auth/me").status_code == 401


def test_compte_desactive_coupe_les_sessions_ouvertes(client, repo):
    login(client)
    repo.users["direction@demo.test"].is_active = False
    assert client.get("/api/v2/auth/me").status_code == 401
    assert repo.sessions == {}


@pytest.mark.anyio
async def test_revocation_de_toutes_les_sessions(client, repo, clock):
    login(client)
    login(client.__class__(client.app, base_url="https://testserver"))
    assert len(repo.sessions) == 2
    user = repo.users["direction@demo.test"]
    assert await revoke_all_sessions(repo, user.id, Client("127.0.0.1", None), clock.now, "password_changed") == 2
    assert client.get("/api/v2/auth/me").status_code == 401


# --- Déconnexion -------------------------------------------------------------

def test_deconnexion_supprime_la_session_et_le_cookie(client, repo):
    login(client)
    token = client.cookies[COOKIE]
    response = client.post("/api/v2/auth/logout", headers=ORIGIN)
    assert response.status_code == 204
    assert f'{COOKIE}=""' in response.headers["set-cookie"] or "Max-Age=0" in response.headers["set-cookie"]
    assert repo.sessions == {}
    # Le jeton volé avant la déconnexion ne sert plus à rien.
    client.cookies.set(COOKIE, token)
    assert client.get("/api/v2/auth/me").status_code == 401


def test_deconnexion_sans_session_ne_fait_rien(client):
    assert client.post("/api/v2/auth/logout", headers=ORIGIN).status_code == 204


# --- Requêtes intersites (Origin) --------------------------------------------

def test_requete_sans_origin_refusee(client, repo):
    response = client.post("/api/v2/auth/login", json={"email": "direction@demo.test", "password": PASSWORD})
    assert response.status_code == 403
    assert repo.events == []


def test_requete_d_un_autre_site_refusee(client):
    response = client.post("/api/v2/auth/login", json={"email": "direction@demo.test", "password": PASSWORD},
                           headers={"Origin": "https://site-malveillant.example"})
    assert response.status_code == 403


def test_deconnexion_forcee_depuis_un_autre_site_refusee(client, repo):
    login(client)
    response = client.post("/api/v2/auth/logout", headers={"Origin": "https://site-malveillant.example"})
    assert response.status_code == 403
    assert len(repo.sessions) == 1


def test_lecture_sans_origin_autorisee(client):
    login(client)
    assert client.get("/api/v2/auth/me").status_code == 200


# --- Limitation des tentatives -----------------------------------------------

def test_delai_apres_5_echecs(client, repo, clock):
    for _ in range(5):
        assert login(client, password="mauvaise phrase de passe").status_code == 401
        clock.advance(seconds=1)
    clock.advance(seconds=-1)
    response = login(client)
    assert response.status_code == 429
    assert response.headers["retry-after"] == "1"
    clock.advance(seconds=1)
    assert login(client).status_code == 200


def test_blocage_de_15_minutes_apres_10_echecs(client, repo, clock):
    for _ in range(10):
        assert login(client, password="mauvaise phrase de passe").status_code == 401
        clock.advance(seconds=60)
    clock.advance(seconds=-60)
    # Même avec le bon mot de passe : le compte est bloqué.
    response = login(client)
    assert response.status_code == 429
    assert response.headers["retry-after"] == "900"
    assert len(repo.events_of(AuthEventType.LOGIN_THROTTLED)) == 1
    clock.advance(minutes=15)
    assert login(client).status_code == 200


def fail_until_blocked(client, clock, emails):
    """Échoue sur chaque adresse en respectant les délais imposés, comme un attaquant patient."""
    for email in emails:
        response = login(client, email=email, password="mauvaise phrase de passe")
        while response.status_code == 429 and response.headers["retry-after"] != "900":
            clock.advance(seconds=int(response.headers["retry-after"]))
            response = login(client, email=email, password="mauvaise phrase de passe")


def test_tentatives_pendant_le_blocage_ne_le_prolongent_pas(client, repo, clock):
    fail_until_blocked(client, clock, ["direction@demo.test"] * 10)
    for _ in range(20):
        assert login(client, password="mauvaise phrase de passe").status_code == 429
    assert len(repo.events_of(AuthEventType.LOGIN_FAILED)) == 10
    clock.advance(minutes=15)
    assert login(client).status_code == 200


def test_limitation_aussi_pour_une_adresse_inconnue(client, clock):
    # Sinon, la différence de comportement révélerait quelles adresses existent.
    fail_until_blocked(client, clock, ["inconnu@demo.test"] * 10)
    response = login(client, email="inconnu@demo.test", password="mauvaise phrase de passe")
    assert response.status_code == 429
    assert response.headers["retry-after"] == "900"


def test_blocage_par_ip_sur_plusieurs_comptes(client, repo, clock):
    fail_until_blocked(client, clock, [f"essai{index}@demo.test" for index in range(30)])
    assert len(repo.events_of(AuthEventType.LOGIN_FAILED)) == 30
    response = login(client)
    assert response.status_code == 429
    assert response.headers["retry-after"] == "900"


def test_session_de_tablette_refusee_comme_session_web(client, repo):
    # Une session d'action de tablette (LUN-005) ne donne jamais accès à l'espace web.
    login(client)
    (stored,) = repo.sessions.values()
    stored.kind = "tablet"
    assert client.get("/api/v2/auth/me").status_code == 401
