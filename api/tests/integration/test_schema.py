"""Migrations face aux modèles, et contraintes portées par la base."""

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

import app.auth.models  # noqa: F401
import app.nurseries.models  # noqa: F401
from app.auth.models import AppUser, UserRole
from app.models import Base
from app.nurseries.models import NurseryAccess

pytestmark = pytest.mark.anyio


async def test_migrations_a_jour_et_reversibles(db):
    # La fixture de session a déjà appliqué, annulé puis réappliqué toutes les migrations.
    assert (await db.execute(text("SELECT version_num FROM alembic_version"))).scalar_one() == "0003"


async def test_migrations_conformes_aux_modeles(db):
    """Aucun écart entre le schéma produit par les migrations et les modèles SQLAlchemy.

    Un modèle modifié sans migration (ou l'inverse) fait échouer ce test.
    """
    connection = await db.connection()
    diff = await connection.run_sync(
        lambda sync: compare_metadata(MigrationContext.configure(sync, opts={"compare_type": True}), Base.metadata))
    assert diff == []


async def test_adresse_en_majuscules_refusee_par_la_base(db, data):
    with pytest.raises(IntegrityError, match="app_user_email_lowercase"):
        async with db.begin_nested():
            await data.user("Majuscules@demo.test", UserRole.GUARDIAN)


async def test_adresse_unique(db, data):
    await data.user("unique@demo.test", UserRole.GUARDIAN)
    with pytest.raises(IntegrityError):
        async with db.begin_nested():
            await data.user("unique@demo.test", UserRole.GUARDIAN)


@pytest.mark.parametrize(("role", "with_enterprise"), [
    (UserRole.OWNER, False), (UserRole.EMPLOYEE, False), (UserRole.DEVELOPER, True), (UserRole.GUARDIAN, True),
])
async def test_entreprise_coherente_avec_le_role(db, data, role, with_enterprise):
    enterprise = await data.enterprise("Groupe A")
    with pytest.raises(IntegrityError, match="app_user_enterprise_matches_role"):
        async with db.begin_nested():
            await data.user(f"{role}@demo.test", role, enterprise if with_enterprise else None)


async def test_acces_entre_deux_entreprises_refuse_par_la_base(db, data):
    a, b = await data.enterprise("Groupe A"), await data.enterprise("Groupe B")
    employee = await data.user("employe@a.test", UserRole.EMPLOYEE, a)
    nursery_b = await data.nursery(b, "Crèche B")
    for declared in (a.id, b.id):
        with pytest.raises(IntegrityError, match="fk_nursery_access_"):
            async with db.begin_nested():
                db.add(NurseryAccess(user_id=employee.id, nursery_id=nursery_b.id, enterprise_id=declared))
                await db.flush()


async def test_suppression_d_un_compte_supprime_ses_acces_et_sessions(db, data):
    a = await data.enterprise("Groupe A")
    employee = await data.user("employe@a.test", UserRole.EMPLOYEE, a)
    await data.grant(employee, await data.nursery(a, "Crèche A"))
    await db.delete(employee)
    await db.flush()
    count = await db.scalar(text("SELECT count(*) FROM nursery_access WHERE user_id = :id"), {"id": employee.id})
    assert count == 0


async def test_journal_garde_les_evenements_d_un_compte_supprime(db, data):
    user = await data.user("parti@demo.test", UserRole.GUARDIAN)
    await db.execute(text("INSERT INTO auth_event (event, user_id, email) VALUES ('login_succeeded', :id, :email)"),
                     {"id": user.id, "email": user.email})
    await db.delete(await db.get(AppUser, user.id))
    await db.flush()
    row = (await db.execute(text("SELECT user_id, email FROM auth_event WHERE email = 'parti@demo.test'"))).one()
    assert row == (None, "parti@demo.test")

