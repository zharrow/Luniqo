import base64

import pytest

from app.config import Settings, read_mfa_key, read_password
from app.db import new_session


def test_url_echappe_les_caracteres_speciaux_du_mot_de_passe():
    settings = Settings("db", 5432, "luniqo", "luniqo", "p@ss:w/rd", 5)
    assert settings.database_url == "postgresql+psycopg://luniqo:p%40ss%3Aw%2Frd@db:5432/luniqo"


def test_mot_de_passe_lu_dans_le_fichier_secret(tmp_path, monkeypatch):
    secret = tmp_path / "db_password"
    secret.write_text("secret-du-fichier\n")
    monkeypatch.setenv("DB_PASSWORD_FILE", str(secret))
    monkeypatch.setenv("DB_PASSWORD", "ignore")
    assert read_password() == "secret-du-fichier"


def test_mot_de_passe_en_variable_sans_fichier(monkeypatch):
    monkeypatch.delenv("DB_PASSWORD_FILE", raising=False)
    monkeypatch.setenv("DB_PASSWORD", "dev")
    assert read_password() == "dev"


def test_sessions_de_base_gardent_leurs_valeurs_apres_commit():
    # Régression LUN-003 : connexion en erreur 500 (MissingGreenlet) sur la vraie base.
    assert new_session().sync_session.expire_on_commit is False


def test_cle_mfa_lue_dans_le_fichier_secret(tmp_path, monkeypatch):
    key = base64.b64encode(bytes(range(32))).decode()
    secret = tmp_path / "mfa_key"
    secret.write_text(key + "\n")
    monkeypatch.setenv("MFA_KEY_FILE", str(secret))
    monkeypatch.setenv("MFA_KEY", "ignoree")
    assert read_mfa_key() == bytes(range(32))


def test_cle_mfa_absente(monkeypatch):
    monkeypatch.delenv("MFA_KEY_FILE", raising=False)
    monkeypatch.delenv("MFA_KEY", raising=False)
    assert read_mfa_key() is None


@pytest.mark.parametrize("value", ["pas du base64 !", base64.b64encode(b"trop courte").decode(),
                                   base64.b64encode(bytes(33)).decode()])
def test_cle_mfa_mal_formee_arrete_le_demarrage(monkeypatch, value):
    monkeypatch.delenv("MFA_KEY_FILE", raising=False)
    monkeypatch.setenv("MFA_KEY", value)
    with pytest.raises(ValueError, match="32 octets"):
        read_mfa_key()
