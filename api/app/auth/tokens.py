"""Jetons de session : 256 bits aléatoires, seule leur empreinte est stockée."""

import hashlib
import secrets


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_digest(token: str) -> bytes:
    # Le jeton est aléatoire et long : une empreinte rapide suffit, un
    # algorithme lent comme Argon2 ne sert que pour les secrets choisis par
    # un humain. Une fuite de la base ne permet donc pas de rejouer une session.
    return hashlib.sha256(token.encode()).digest()
