from app.config import Settings, read_password


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
