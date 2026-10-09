"""Règles du second facteur (ADR-004) : calcul TOTP sur les vecteurs officiels, rejeu, codes de secours, états."""

import base64
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse

import pytest

from app.auth.models import UserRole
from app.mfa import policy
from app.mfa.policy import MfaState

RFC_SECRET = b"12345678901234567890"


@pytest.mark.parametrize(("counter", "expected"), list(enumerate(
    ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"])))
def test_hotp_vecteurs_rfc_4226(counter, expected):
    assert policy.hotp(RFC_SECRET, counter) == expected


@pytest.mark.parametrize(("timestamp", "expected"), [
    (59, "94287082"), (1111111109, "07081804"), (1111111111, "14050471"),
    (1234567890, "89005924"), (2000000000, "69279037"), (20000000000, "65353130"),
])
def test_totp_vecteurs_rfc_6238_sha1(timestamp, expected):
    now = datetime.fromtimestamp(timestamp, UTC)
    assert policy.hotp(RFC_SECRET, policy.time_step(now), digits=8) == expected


NOW = datetime(2026, 10, 9, 9, 0, 15, tzinfo=UTC)


def code_at(moment: datetime) -> str:
    return policy.hotp(RFC_SECRET, policy.time_step(moment))


def test_code_courant_accepte_et_pas_renvoye():
    match = policy.check_totp(RFC_SECRET, code_at(NOW), NOW, last_used_step=None)
    assert match.step == policy.time_step(NOW) and not match.replay


@pytest.mark.parametrize("offset", [-30, 30])
def test_un_pas_de_tolerance_de_chaque_cote(offset):
    assert policy.check_totp(RFC_SECRET, code_at(NOW + timedelta(seconds=offset)), NOW, None).step is not None


@pytest.mark.parametrize("offset", [-60, 60, -3600])
def test_au_dela_d_un_pas_refuse(offset):
    assert policy.check_totp(RFC_SECRET, code_at(NOW + timedelta(seconds=offset)), NOW, None).step is None


def test_code_deja_utilise_refuse_comme_rejeu():
    step = policy.time_step(NOW)
    match = policy.check_totp(RFC_SECRET, code_at(NOW), NOW, last_used_step=step)
    assert match.step is None and match.replay


def test_code_d_un_pas_anterieur_au_dernier_utilise_refuse():
    # Le code du pas précédent est encore dans la tolérance, mais un code plus récent a déjà servi.
    previous = code_at(NOW - timedelta(seconds=30))
    match = policy.check_totp(RFC_SECRET, previous, NOW, last_used_step=policy.time_step(NOW))
    assert match.step is None and match.replay


@pytest.mark.parametrize("code", ["", "12345", "1234567", "abcdef", "١٢٣٤٥٦", "12 34 5"])
def test_code_mal_forme_refuse_sans_calcul(code):
    assert policy.check_totp(RFC_SECRET, code, NOW, None) == policy.TotpMatch()


def test_espaces_toleres_dans_le_code():
    code = code_at(NOW)
    assert policy.check_totp(RFC_SECRET, f" {code[:3]} {code[3:]} ", NOW, None).step is not None


def test_secret_de_160_bits_et_uri_lisible_par_les_applications():
    secret = policy.new_totp_secret()
    assert len(secret) == 20 and secret != policy.new_totp_secret()
    uri = urlparse(policy.otpauth_uri(secret, "camille@demo.test"))
    assert (uri.scheme, uri.netloc, uri.path) == ("otpauth", "totp", "/Luniqo:camille@demo.test")
    query = {key: values[0] for key, values in parse_qs(uri.query).items()}
    assert query == {"secret": policy.secret_to_base32(secret), "issuer": "Luniqo", "algorithm": "SHA1",
                     "digits": "6", "period": "30"}
    assert len(query["secret"]) == 32 and base64.b32decode(query["secret"]) == secret


# --- Codes de secours -------------------------------------------------------------

def test_code_de_secours_de_60_bits_sans_caractere_ambigu():
    codes = {policy.new_backup_code() for _ in range(200)}
    assert len(codes) == 200
    for code in codes:
        assert len(code) == 12 and set(code) <= set(policy.BACKUP_ALPHABET)
        assert not set(code) & set("ILOU")
    assert len(policy.BACKUP_ALPHABET) == 32  # 5 bits par caractère


def test_code_de_secours_affiche_par_groupes_et_relu_dans_toutes_les_formes():
    code = "AB12CD34EF56"
    shown = policy.format_backup_code(code)
    assert shown == "AB12-CD34-EF56"
    for typed in (shown, shown.lower(), "ab12 cd34 ef56", "AB12CD34EF56", " ab12-cd34-ef56 "):
        assert policy.normalize_backup_code(typed) == code
    # O et I/L saisis à la place de 0 et 1.
    assert policy.normalize_backup_code("ABI2-CD34-EF56") == "AB12CD34EF56"
    assert policy.normalize_backup_code("0O00-0000-0000") == "000000000000"


@pytest.mark.parametrize("typed", ["", "AB12-CD34-EF5", "AB12-CD34-EF567", "AB12-CD34-EF5U", "AB12-CD34-EF5!"])
def test_code_de_secours_mal_forme(typed):
    assert policy.normalize_backup_code(typed) is None


def test_code_de_secours_partie_de_recherche_et_partie_hachee():
    assert policy.split_backup_code("AB12CD34EF56") == ("AB12", "CD34EF56")


# --- Qui doit présenter un second facteur ------------------------------------------

@pytest.mark.parametrize(("role", "has_factor", "expected"), [
    (UserRole.OWNER, False, True), (UserRole.DEVELOPER, False, True),
    (UserRole.EMPLOYEE, False, False), (UserRole.GUARDIAN, False, False),
    (UserRole.EMPLOYEE, True, True), (UserRole.GUARDIAN, True, True),
])
def test_second_facteur_exige(role, has_factor, expected):
    assert policy.second_factor_required(role, has_factor) is expected


@pytest.mark.parametrize(("required", "verified", "has_factor", "expected"), [
    (False, False, False, MfaState.NOT_REQUIRED),
    (True, False, False, MfaState.SETUP_REQUIRED),
    (True, False, True, MfaState.REQUIRED),
    (True, True, True, MfaState.VERIFIED),
    (False, True, True, MfaState.VERIFIED),
])
def test_etat_de_la_session(required, verified, has_factor, expected):
    assert policy.session_state(required, NOW if verified else None, has_factor) == expected


def test_authentification_recente_depuis_la_derniere_preuve():
    login = NOW
    assert policy.recently_authenticated(login, None, login + timedelta(minutes=15))
    assert not policy.recently_authenticated(login, None, login + timedelta(minutes=15, seconds=1))
    # Le second facteur présenté plus tard relance la fenêtre.
    assert policy.recently_authenticated(login, login + timedelta(minutes=10), login + timedelta(minutes=24))


@pytest.mark.parametrize(("state", "recent", "expected"), [
    (MfaState.REQUIRED, True, "mfa_pending"),
    (MfaState.REQUIRED, False, "mfa_pending"),
    (MfaState.SETUP_REQUIRED, False, "reauthentication_required"),
    (MfaState.VERIFIED, False, "reauthentication_required"),
    (MfaState.SETUP_REQUIRED, True, None),
    (MfaState.VERIFIED, True, None),
    (MfaState.NOT_REQUIRED, True, None),
])
def test_gestion_des_facteurs(state, recent, expected):
    assert policy.management_refusal(state, recent) == expected


@pytest.mark.parametrize(("role", "expected"), [
    (UserRole.OWNER, False), (UserRole.DEVELOPER, False), (UserRole.EMPLOYEE, True), (UserRole.GUARDIAN, True)])
def test_dernier_facteur_retirable_seulement_si_facultatif(role, expected):
    assert policy.can_remove_last_factor(role) is expected


def test_totp_bloque_a_100_echecs_consecutifs():
    assert not policy.totp_locked(99)
    assert policy.totp_locked(100)
