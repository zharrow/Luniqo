"""Règles des passkeys (ADR-004) et authentificateur simulé des tests d'intégration."""

import os
import uuid
from datetime import UTC, datetime, timedelta

import pytest
import webauthn
from webauthn.helpers import bytes_to_base64url, options_to_json_dict
from webauthn.helpers.exceptions import InvalidAuthenticationResponse, InvalidRegistrationResponse

from app.auth.models import UserRole
from app.passkeys import policy
from tests.passkeys.authenticator import ORIGIN, RP_ID, SoftAuthenticator

NOW = datetime(2026, 10, 27, 9, 30, tzinfo=UTC)


# --- Domaine et origines ----------------------------------------------------------

def test_domaine_tire_de_la_premiere_origine():
    rp = policy.relying_party(("https://app.luniqo.fr", "https://recette.app.luniqo.fr"))
    assert rp == policy.RelyingParty(id="app.luniqo.fr",
                                     origins=("https://app.luniqo.fr", "https://recette.app.luniqo.fr"))


def test_developpement_local():
    assert policy.relying_party(("http://localhost:8080",)) == policy.RelyingParty(
        id="localhost", origins=("http://localhost:8080",))


@pytest.mark.parametrize("origin", ["https://luniqo.fr.attaquant.test", "https://evil-app.luniqo.fr",
                                    "https://luniqo.fr"])
def test_origine_hors_du_domaine_ecartee(origin):
    # Un domaine qui se termine pareil sans être un sous-domaine, ou le domaine parent, n'est pas admis.
    assert policy.relying_party(("https://app.luniqo.fr", origin)).origins == ("https://app.luniqo.fr",)


@pytest.mark.parametrize("origins", [(), ("pas-une-url",)])
def test_sans_origine_pas_de_passkey(origins):
    assert policy.relying_party(origins) is None


# --- Défis, noms, retrait ------------------------------------------------------------

def test_defi_aleatoire_de_32_octets():
    challenges = {policy.new_challenge() for _ in range(100)}
    assert len(challenges) == 100 and all(len(c) == 32 for c in challenges)


def test_defi_valable_5_minutes():
    expires_at = NOW + policy.TIMEOUT
    assert policy.challenge_usable(expires_at, NOW + timedelta(minutes=4, seconds=59))
    assert not policy.challenge_usable(expires_at, expires_at)


@pytest.mark.parametrize(("name", "expected"), [
    ("iPhone de Camille", "iPhone de Camille"),
    ("  Mac   du   bureau ", "Mac du bureau"),
    ("", None),
    ("   ", None),
    ("x" * 64, "x" * 64),
    ("x" * 65, None),
])
def test_nom_normalise(name, expected):
    assert policy.normalize_name(name) == expected


@pytest.mark.parametrize("role", [UserRole.OWNER, UserRole.DEVELOPER])
def test_direction_garde_un_facteur(role):
    assert not policy.can_remove_factor(role, remaining_factors=0)
    assert policy.can_remove_factor(role, remaining_factors=1)


@pytest.mark.parametrize("role", [UserRole.EMPLOYEE, UserRole.GUARDIAN])
def test_autres_comptes_peuvent_tout_retirer(role):
    assert policy.can_remove_factor(role, remaining_factors=0)


# --- Authentificateur simulé contre py_webauthn ----------------------------------------
# Vérifie que les réponses simulées sont bien celles d'un navigateur : sans
# cela, les tests d'intégration pourraient passer pour de mauvaises raisons.

def _registration_options() -> dict:
    return options_to_json_dict(webauthn.generate_registration_options(
        rp_id=RP_ID, rp_name="Luniqo", user_name="camille@demo.test", user_id=uuid.uuid4().bytes,
        challenge=os.urandom(32)))


def _register(device: SoftAuthenticator, **kwargs):
    options = _registration_options()
    return webauthn.verify_registration_response(
        credential=device.create(options, **kwargs), expected_challenge=webauthn.base64url_to_bytes(
            options["challenge"]), expected_rp_id=RP_ID, expected_origin=ORIGIN, require_user_verification=True)


def _authenticate(device: SoftAuthenticator, public_key: bytes, current_count: int, **kwargs):
    challenge = os.urandom(32)
    options = {"challenge": bytes_to_base64url(challenge), "rpId": RP_ID}
    return webauthn.verify_authentication_response(
        credential=device.get(options, **kwargs), expected_challenge=challenge, expected_rp_id=RP_ID,
        expected_origin=ORIGIN, credential_public_key=public_key, credential_current_sign_count=current_count,
        require_user_verification=True)


def test_authentificateur_simule_accepte_par_py_webauthn():
    device = SoftAuthenticator()
    registered = _register(device)
    assert registered.credential_id == device.credential_id and registered.user_verified
    assert _authenticate(device, registered.credential_public_key, registered.sign_count).new_sign_count == 2


def test_authentificateur_simule_refuse_quand_il_le_faut():
    device = SoftAuthenticator()
    with pytest.raises(InvalidRegistrationResponse):
        _register(device, user_verified=False)
    with pytest.raises(InvalidRegistrationResponse):
        _register(SoftAuthenticator(), origin="https://attaquant.test")
    registered = _register(SoftAuthenticator())
    with pytest.raises(InvalidAuthenticationResponse):
        _authenticate(SoftAuthenticator(), registered.credential_public_key, 0)  # autre clé


def test_passkey_synchronisee_toujours_a_zero():
    device = SoftAuthenticator(synced=True)
    registered = _register(device)
    assert registered.sign_count == 0 and registered.credential_backed_up
    assert _authenticate(device, registered.credential_public_key, 0).new_sign_count == 0
