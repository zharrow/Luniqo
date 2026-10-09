"""Seed de démonstration sur PostgreSQL : contenu attendu et idempotence."""

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.auth.models import AppUser
from app.children.models import Child, ChildGuardian, Family, Guardian
from app.nurseries.models import Enterprise, Nursery, NurseryAccess
from app.seed import seed, seed_families, seed_users

DEMO_PASSWORD = "une phrase de passe de démonstration"


@pytest.fixture
def sync_session(database_url):
    engine = create_engine(database_url)
    with engine.connect() as connection:
        transaction = connection.begin()
        session = Session(bind=connection, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            session.close()
            transaction.rollback()
    engine.dispose()


def counts(session):
    return tuple(session.scalar(select(func.count()).select_from(model))
                 for model in (Enterprise, Nursery, AppUser, NurseryAccess, Family, Child, Guardian, ChildGuardian))


def test_seed_cree_les_donnees_puis_ne_fait_plus_rien(sync_session):
    assert seed(sync_session) == 3
    assert seed_families(sync_session) == 4
    assert seed_users(sync_session, DEMO_PASSWORD) == 4
    assert counts(sync_session) == (2, 3, 4, 2, 4, 5, 6, 8)
    assert seed(sync_session) == 0
    assert seed_families(sync_session) == 0
    assert seed_users(sync_session, DEMO_PASSWORD) == 0
    assert counts(sync_session) == (2, 3, 4, 2, 4, 5, 6, 8)


def test_seed_isole_les_deux_entreprises(sync_session):
    seed(sync_session)
    seed_users(sync_session, DEMO_PASSWORD)
    rows = sync_session.execute(
        select(AppUser.email, Enterprise.name).join(Enterprise, Enterprise.id == AppUser.enterprise_id)).all()
    assert dict(rows) == {
        "direction@demo.test": "Groupe Démo", "employe@demo.test": "Groupe Démo",
        "employe.sud@demo.test": "Groupe Démo", "direction@temoin.test": "Groupe Témoin",
    }
