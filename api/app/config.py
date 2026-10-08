"""Configuration de l'API, lue dans les variables d'environnement.

Le mot de passe de la base est lu dans un fichier (secret Docker monté dans
/run/secrets) plutôt que dans une variable : il n'apparaît ni dans
`docker inspect` ni dans l'environnement des processus.
"""

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
    )
