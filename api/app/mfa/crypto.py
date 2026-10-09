"""Chiffrement des secrets TOTP en base : AES-256-GCM (ADR-004).

Le secret TOTP doit être relu pour vérifier un code : il ne peut pas être
haché comme un mot de passe. Il est donc chiffré, avec une clé qui n'est pas
dans la base (secret Docker). Une copie de la base seule ne donne aucun secret.

Format : version (1 octet) | nonce (12 octets) | chiffré et étiquette.
L'identifiant du compte est authentifié avec le chiffré (données associées) :
un secret recopié sur la ligne d'un autre compte ne se déchiffre pas.
"""

import os
import uuid

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

VERSION = b"\x01"
NONCE_SIZE = 12


class SecretUnreadable(Exception):
    """Chiffré altéré, clé différente ou secret d'un autre compte."""


def _associated_data(user_id: uuid.UUID) -> bytes:
    return b"luniqo:totp:" + user_id.bytes


def encrypt_secret(key: bytes, user_id: uuid.UUID, secret: bytes) -> bytes:
    # Nonce aléatoire de 96 bits : sans risque de répétition au volume de
    # Luniqo (une activation de temps en temps par compte).
    nonce = os.urandom(NONCE_SIZE)
    return VERSION + nonce + AESGCM(key).encrypt(nonce, secret, _associated_data(user_id))


def decrypt_secret(key: bytes, user_id: uuid.UUID, blob: bytes) -> bytes:
    if blob[:1] != VERSION:
        raise SecretUnreadable("version de chiffrement inconnue")
    nonce, ciphertext = blob[1:1 + NONCE_SIZE], blob[1 + NONCE_SIZE:]
    try:
        return AESGCM(key).decrypt(nonce, ciphertext, _associated_data(user_id))
    except InvalidTag:
        raise SecretUnreadable("secret illisible avec cette clé pour ce compte") from None
