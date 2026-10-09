"""Configuration de l'API, lue dans les variables d'environnement.

Le mot de passe de la base et la clé de chiffrement des seconds facteurs sont
lus dans des fichiers (secrets Docker montés dans /run/secrets) plutôt que
dans des variables : ils n'apparaissent ni dans `docker inspect` ni dans
l'environnement des processus.
"""

import base64
import binascii
import os
from dataclasses import dataclass
from functools import lru_cache
from urllib.parse import quote


@dataclass(frozen=True)
class Settings:
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    db_pool_size: int
    # Origines autorisées à envoyer des requêtes qui modifient des données
    # (contrôle de l'en-tête Origin, ADR-003). Front et API partagent l'origine
    # de la passerelle.
    app_origins: tuple[str, ...] = ("http://localhost:8080",)
    # Cookie de session Secure, préfixé __Host-. À désactiver seulement pour
    # un développement local sur un navigateur qui refuse Secure en HTTP.
    cookie_secure: bool = True
    # Clé AES-256 qui chiffre les secrets TOTP en base (ADR-004). Absente :
    # les routes du second facteur répondent 503, le reste de l'API fonctionne.
    mfa_key: bytes | None = None

    @property
    def database_url(self) -> str:
        user = quote(self.db_user, safe="")
        password = quote(self.db_password, safe="")
        return (
            f"postgresql+psycopg://{user}:{password}"
            f"@{self.db_host}:{self.db_port}/{quote(self.db_name, safe='')}"
        )


def read_password() -> str:
    """DB_PASSWORD_FILE en priorité, DB_PASSWORD sinon (développement local)."""
    path = os.environ.get("DB_PASSWORD_FILE")
    if path:
        with open(path, encoding="utf-8") as secret:
            return secret.read().strip()
    return os.environ.get("DB_PASSWORD", "")


def read_mfa_key() -> bytes | None:
    """Clé de 32 octets encodée en base64 : MFA_KEY_FILE en priorité, MFA_KEY sinon (tests, développement)."""
    path = os.environ.get("MFA_KEY_FILE")
    if path:
        with open(path, encoding="utf-8") as secret:
            encoded = secret.read().strip()
    else:
        encoded = os.environ.get("MFA_KEY", "").strip()
    if not encoded:
        return None
    try:
        key = base64.b64decode(encoded, validate=True)
    except binascii.Error:
        key = b""
    if len(key) != 32:
        # Une clé mal formée arrête le démarrage : mieux qu'un chiffrement faible ou un échec à la première activation.
        raise ValueError("MFA_KEY : 32 octets encodés en base64 attendus (openssl rand -base64 32)")
    return key


@lru_cache
def get_settings() -> Settings:
    host, _, port = os.environ.get("DB_ADDR", "localhost:5432").partition(":")
    return Settings(
        db_host=host,
        db_port=int(port or 5432),
        db_name=os.environ.get("DB_NAME", "luniqo"),
        db_user=os.environ.get("DB_USER", "luniqo"),
        db_password=read_password(),
        db_pool_size=int(os.environ.get("DB_POOL_SIZE", "5")),
        app_origins=tuple(
            origin.strip().rstrip("/")
            for origin in os.environ.get("APP_ORIGINS", "http://localhost:8080").split(",")
            if origin.strip()
        ),
        cookie_secure=os.environ.get("SESSION_COOKIE_SECURE", "true").lower() != "false",
        mfa_key=read_mfa_key(),
    )
