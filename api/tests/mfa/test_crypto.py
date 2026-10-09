"""Chiffrement des secrets TOTP : un chiffré ne se lit qu'avec la bonne clé, pour le bon compte."""

import os
import uuid

import pytest

from app.mfa.crypto import SecretUnreadable, decrypt_secret, encrypt_secret

KEY = os.urandom(32)
USER = uuid.uuid4()
SECRET = os.urandom(20)


def test_aller_retour():
    assert decrypt_secret(KEY, USER, encrypt_secret(KEY, USER, SECRET)) == SECRET


def test_secret_absent_du_chiffre_et_nonce_unique():
    first, second = encrypt_secret(KEY, USER, SECRET), encrypt_secret(KEY, USER, SECRET)
    assert SECRET not in first and first != second
    assert len(first) == 1 + 12 + len(SECRET) + 16  # version, nonce, chiffré, étiquette


def test_autre_cle_refusee():
    with pytest.raises(SecretUnreadable):
        decrypt_secret(os.urandom(32), USER, encrypt_secret(KEY, USER, SECRET))


def test_secret_recopie_sur_un_autre_compte_refuse():
    with pytest.raises(SecretUnreadable):
        decrypt_secret(KEY, uuid.uuid4(), encrypt_secret(KEY, USER, SECRET))


@pytest.mark.parametrize("position", [0, 5, 20, -1])
def test_chiffre_altere_refuse(position):
    blob = bytearray(encrypt_secret(KEY, USER, SECRET))
    blob[position] ^= 0x01
    with pytest.raises(SecretUnreadable):
        decrypt_secret(KEY, USER, bytes(blob))
