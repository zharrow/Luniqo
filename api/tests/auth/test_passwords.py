import pytest
from argon2 import PasswordHasher

from app.auth.passwords import PasswordPolicyError, check_policy, hash_password, verify_password


@pytest.mark.parametrize("password", [
    "une phrase de passe assez longue",
    "Le-lapin-mange-17-carottes",
    "crèche des petits loups 2026",
])
def test_politique_accepte_les_phrases_de_passe(password):
    check_policy(password, "direction@demo.test")


@pytest.mark.parametrize(("password", "message"), [
    ("quatorze-carac", "au moins 15"),
    ("x" * 120 + "abcdefghi", "au plus 128"),
    ("aaaaaaaaaaaaaaaaaaaa", "prévisible"),
    ("abababababababababab", "prévisible"),
    ("azertyuiopqsdfgh", "prévisible"),
    ("123456789012345678", "prévisible"),
    ("Motdepasse2024!!!!", "courant"),
    ("P@ssw0rd-1234567890", "courant"),
    ("!!Azerty2024!!!!!!!!", "courant"),
    ("direction-de-la-creche", "adresse e-mail"),
])
def test_politique_refuse(password, message):
    with pytest.raises(PasswordPolicyError, match=message):
        check_policy(password, "direction@demo.test")


def test_aucune_regle_de_composition_n_est_imposee():
    # NIST SP 800-63B-4 : ni majuscule, ni chiffre, ni symbole obligatoires.
    check_policy("tout en minuscules sans chiffre")


@pytest.mark.anyio
async def test_hachage_argon2id_avec_les_parametres_owasp():
    hashed = await hash_password("une phrase de passe assez longue")
    assert hashed.startswith("$argon2id$v=19$m=19456,t=2,p=1$")
    assert await verify_password(hashed, "une phrase de passe assez longue") == (True, False)
    assert await verify_password(hashed, "une autre phrase de passe") == (False, False)


@pytest.mark.anyio
async def test_deux_hachages_du_meme_mot_de_passe_different():
    # Sel aléatoire : deux comptes au même mot de passe n'ont pas le même haché.
    password = "une phrase de passe assez longue"
    assert await hash_password(password) != await hash_password(password)


@pytest.mark.anyio
async def test_compte_inconnu_verifie_un_hache_factice():
    assert await verify_password(None, "une phrase de passe assez longue") == (False, False)


@pytest.mark.anyio
async def test_hache_corrompu_refuse_sans_exception():
    assert await verify_password("pas-un-hache", "une phrase de passe assez longue") == (False, False)


@pytest.mark.anyio
async def test_normalisation_unicode_nfkc():
    # « é » précomposé (U+00E9) ou « e » + accent combinant (U+0301) : même mot de passe.
    hashed = await hash_password("une crèche à l'école maternelle")
    assert (await verify_password(hashed, "une crèche à l'école maternelle"))[0]


@pytest.mark.anyio
async def test_hache_ancien_a_recalculer():
    weak = PasswordHasher(time_cost=1, memory_cost=8 * 1024, parallelism=1).hash("une phrase de passe assez longue")
    assert await verify_password(weak, "une phrase de passe assez longue") == (True, True)
