"""Mots de passe : politique et hachage Argon2id (ADR-003).

Politique (NIST SP 800-63B-4) : 15 à 128 caractères, aucune règle de
composition, refus des mots de passe courants et de ceux qui reprennent
l'identifiant. Hachage (OWASP) : Argon2id, 19 Mio, 2 itérations,
parallélisme 1.
"""

import re
import unicodedata

import anyio
import anyio.to_thread
from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError

MIN_LENGTH = 15
MAX_LENGTH = 128

_hasher = PasswordHasher(time_cost=2, memory_cost=19 * 1024, parallelism=1, hash_len=32, salt_len=16, type=Type.ID)

# Vérifié quand le compte n'existe pas : la réponse prend le même temps que
# pour un compte réel, ce qui empêche de deviner les adresses inscrites.
_DUMMY_HASH = _hasher.hash("compte inexistant, haché factice")

# Un hachage occupe 19 Mio et un thread. Le conteneur de l'API a 0,5 CPU et
# 128 Mo : un calcul à la fois. Mesuré le 2026-10-08 (60 connexions, 20 en
# parallèle) : avec 2 calculs simultanés, même débit (le CPU est le goulot)
# mais 119 Mo de pointe. Les suivants attendent sans bloquer la boucle.
MAX_PARALLEL_HASHES = 1
_limiter: anyio.CapacityLimiter | None = None

# Mots de passe courants, comparés une fois chiffres, espaces et ponctuation
# retirés : « Motdepasse2024!!! » est refusé comme « motdepasse ».
_COMMON_WORDS = frozenset(
    {
        "azerty", "azertyuiop", "qwerty", "qwertyuiop", "password", "passw", "motdepasse", "mdp",
        "admin", "administrateur", "bonjour", "soleil", "doudou", "loulou", "chouchou", "jetaime",
        "iloveyou", "welcome", "bienvenue", "secret", "changeme", "letmein", "luniqo", "creche",
        "microcreche", "nounou", "bebe", "toulouse", "france",
    }
)

# Suites de clavier ou d'alphabet : un mot de passe qui n'en est qu'un extrait
# (répété ou non) est refusé.
_SEQUENCES = (
    "abcdefghijklmnopqrstuvwxyz",
    "0123456789",
    "9876543210",
    "azertyuiopqsdfghjklmwxcvbn",
    "qwertyuiopasdfghjklzxcvbnm",
)


class PasswordPolicyError(ValueError):
    """Mot de passe refusé par la politique ; le message est destiné à l'utilisateur."""


def normalize(password: str) -> str:
    """Forme NFKC : un même mot de passe saisi sur deux claviers donne le même haché (NIST)."""
    return unicodedata.normalize("NFKC", password)


# Substitutions courantes de lettres par des chiffres ou symboles (« P@ssw0rd »).
_LEET = str.maketrans({"@": "a", "4": "a", "0": "o", "1": "i", "!": "i", "3": "e", "$": "s", "5": "s", "7": "t"})


def _common_forms(password: str) -> set[str]:
    """Formes comparées à la liste des mots courants.

    Lettres seules (« Motdepasse2024!!! » → « motdepasse »), et cœur du mot
    débarrassé des chiffres et symboles en bordure puis des substitutions
    (« P@ssw0rd-1234 » → « password »).
    """
    ascii_lower = unicodedata.normalize("NFKD", password.lower()).encode("ascii", "ignore").decode()
    letters = re.sub(r"[^a-z]", "", ascii_lower)
    core = re.sub(r"[\W\d_]+$", "", re.sub(r"^[^a-z@$]+", "", ascii_lower)).translate(_LEET)
    return {letters, re.sub(r"[^a-z]", "", core)}


def _is_sequence(password: str) -> bool:
    compact = password.lower().replace(" ", "")
    return any(compact in sequence * 4 for sequence in _SEQUENCES)


def check_policy(password: str, email: str | None = None) -> None:
    """Lève PasswordPolicyError si le mot de passe ne peut pas être choisi."""
    password = normalize(password)
    if len(password) < MIN_LENGTH:
        raise PasswordPolicyError(f"Le mot de passe doit contenir au moins {MIN_LENGTH} caractères.")
    if len(password) > MAX_LENGTH:
        raise PasswordPolicyError(f"Le mot de passe doit contenir au plus {MAX_LENGTH} caractères.")
    if len(set(password)) < 4 or _is_sequence(password):
        raise PasswordPolicyError("Ce mot de passe est trop prévisible (répétition ou suite de touches).")
    if _common_forms(password) & _COMMON_WORDS:
        raise PasswordPolicyError("Ce mot de passe est trop courant.")
    if email:
        local_part = email.split("@", 1)[0].lower()
        if len(local_part) >= 4 and local_part in password.lower():
            raise PasswordPolicyError("Le mot de passe ne doit pas reprendre l'adresse e-mail.")


def _get_limiter() -> anyio.CapacityLimiter:
    # Créé à la première utilisation : un CapacityLimiter appartient à la
    # boucle asynchrone en cours.
    global _limiter
    if _limiter is None:
        _limiter = anyio.CapacityLimiter(MAX_PARALLEL_HASHES)
    return _limiter


def hash_password_sync(password: str) -> str:
    """Version synchrone, pour les scripts (seed). L'API utilise hash_password."""
    return _hasher.hash(normalize(password))


async def hash_password(password: str) -> str:
    # Argon2 est un calcul de plusieurs dizaines de millisecondes : exécuté
    # dans un thread (la bibliothèque libère le GIL) pour ne pas figer la boucle.
    return await anyio.to_thread.run_sync(hash_password_sync, password, limiter=_get_limiter())


def _verify_sync(hashed: str | None, password: str) -> tuple[bool, bool]:
    try:
        _hasher.verify(hashed or _DUMMY_HASH, normalize(password))
    except (VerificationError, InvalidHashError):
        return False, False
    if hashed is None:
        return False, False
    return True, _hasher.check_needs_rehash(hashed)


async def verify_password(hashed: str | None, password: str) -> tuple[bool, bool]:
    """Renvoie (mot de passe correct, haché à recalculer avec les paramètres actuels).

    `hashed` à None (compte inconnu ou sans mot de passe) : un haché factice
    est vérifié quand même, pour un temps de réponse identique.
    """
    return await anyio.to_thread.run_sync(_verify_sync, hashed, password, limiter=_get_limiter())
