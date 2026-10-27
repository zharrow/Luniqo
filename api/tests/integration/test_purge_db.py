"""Purge sur PostgreSQL (LUN-54) : ce qui a expiré disparaît, rien de ce que l'API accepte encore."""

import os
import subprocess
import sys
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine, select, text
from sqlalchemy.pool import NullPool

from app.accounts.models import StaffInvitation
from app.auth.models import AuthEvent, AuthEventType, UserRole, UserSession
from app.children.models import Family, Guardian
from app.family.models import Invitation
from app.purge import policy
from app.purge.service import PurgeReport, purge
from app.tablets.models import TabletDevice
from tests.integration.conftest import API_DIR, WEB_COOKIE, login

pytestmark = pytest.mark.anyio

NOW = datetime.now(UTC)
TICK = timedelta(microseconds=1)
LIMIT = policy.cutoffs(NOW)


@pytest.fixture
async def world(db, data):
    a = await data.enterprise("Groupe A")
    nursery = await data.nursery(a, "Crèche A")
    owner = await data.user("direction@a.test", UserRole.OWNER, a)
    employee = await data.user("lea@a.test", UserRole.EMPLOYEE, a)
    tablet = TabletDevice(id=uuid.uuid4(), nursery_id=nursery.id, enterprise_id=a.id, label="Entrée",
                          token_digest=os.urandom(32), expires_at=NOW + timedelta(days=90))
    family = Family(id=uuid.uuid4(), nursery_id=nursery.id, label="Durand", is_active=True)
    db.add_all([tablet, family])
    await db.flush()
    guardian = Guardian(id=uuid.uuid4(), family_id=family.id, nursery_id=nursery.id, first_name="Alex",
                        last_name="Durand", email="alex@famille.test", is_active=True)
    db.add(guardian)
    await db.flush()
    return {"owner": owner, "employee": employee, "tablet": tablet, "guardian": guardian}


async def ids(db, model) -> set:
    return set(await db.scalars(select(model.id)))


async def test_sessions_expirees_supprimees_les_valables_gardees(db, world):
    user, tablet = world["employee"], world["tablet"]

    def session(created_at, last_seen_at, *, on_tablet=False):
        return UserSession(id=uuid.uuid4(), token_digest=os.urandom(32), user_id=user.id, created_at=created_at,
                           last_seen_at=last_seen_at, kind="tablet" if on_tablet else "web",
                           tablet_id=tablet.id if on_tablet else None)

    recent = NOW - timedelta(hours=1)
    expired = [
        session(recent, LIMIT.web_session_seen),                       # inactive depuis 30 min
        session(LIMIT.web_session_created, NOW),                       # ouverte depuis 12 h, même active
        session(LIMIT.tablet_session_created, LIMIT.tablet_session_created, on_tablet=True),
    ]
    kept = [
        session(recent, LIMIT.web_session_seen + TICK),
        session(LIMIT.web_session_created + TICK, NOW),
        session(LIMIT.tablet_session_created + TICK, NOW, on_tablet=True),
        # Une session web de 2 minutes n'a rien d'expiré : la durée de la tablette ne s'applique qu'à elle.
        session(LIMIT.tablet_session_created, NOW),
    ]
    db.add_all(expired + kept)
    await db.flush()

    report = await purge(db, NOW)

    assert report.sessions == len(expired)
    assert await ids(db, UserSession) == {s.id for s in kept}


async def test_journal_garde_6_mois(db, world):
    def event(occurred_at):
        return AuthEvent(occurred_at=occurred_at, event=AuthEventType.LOGIN_SUCCEEDED.value,
                         user_id=world["owner"].id, email=world["owner"].email, ip="203.0.113.7")

    old, limit, kept, recent = (event(LIMIT.auth_event - timedelta(days=30)), event(LIMIT.auth_event),
                                event(LIMIT.auth_event + TICK), event(NOW))
    db.add_all([old, limit, kept, recent])
    await db.flush()

    report = await purge(db, NOW)

    assert report.auth_events == 2
    assert await ids(db, AuthEvent) == {kept.id, recent.id}


async def test_invitations_expirees_supprimees(db, world):
    owner, employee, guardian = world["owner"], world["employee"], world["guardian"]

    def staff(expires_at, **state):
        return StaffInvitation(id=uuid.uuid4(), token_digest=os.urandom(32), user_id=employee.id,
                               created_by=owner.id, expires_at=expires_at, **state)

    def family(expires_at, **state):
        return Invitation(id=uuid.uuid4(), token_digest=os.urandom(32), guardian_id=guardian.id,
                          email=guardian.email, created_by=owner.id, expires_at=expires_at, **state)

    expired = [staff(NOW), staff(NOW - timedelta(days=30), used_at=NOW - timedelta(days=35)), family(NOW)]
    # Une invitation acceptée ou annulée reste jusqu'à son expiration : au plus 7 jours.
    kept = [staff(NOW + TICK), staff(NOW + timedelta(days=6), revoked_at=NOW),
            staff(NOW + timedelta(days=6), used_at=NOW), family(NOW + TICK),
            family(NOW + timedelta(days=6), used_at=NOW)]
    db.add_all(expired + kept)
    await db.flush()

    report = await purge(db, NOW)

    assert (report.staff_invitations, report.family_invitations) == (2, 1)
    assert (await ids(db, StaffInvitation)) | (await ids(db, Invitation)) == {i.id for i in kept}


async def test_purge_idempotente(db, world):
    db.add(AuthEvent(occurred_at=LIMIT.auth_event, event=AuthEventType.LOGOUT.value))
    await db.flush()
    assert (await purge(db, NOW)).auth_events == 1
    assert await purge(db, NOW) == PurgeReport(sessions=0, auth_events=0, staff_invitations=0, family_invitations=0)


async def test_session_en_cours_intacte_apres_la_purge(clients, db, world):
    client = clients()
    assert (await login(client, world["employee"].email)).status_code == 200
    assert (await client.get("/api/v2/auth/me")).status_code == 200

    await purge(db, datetime.now(UTC))

    assert (await client.get("/api/v2/auth/me")).status_code == 200
    assert client.cookies[WEB_COOKIE]


def test_commande_de_purge(database_url):
    """`python -m app.purge`, comme dans le conteneur : suppression validée en base, une ligne de compte rendu."""
    engine = create_engine(database_url, poolclass=NullPool)
    with engine.begin() as connection:
        old = connection.scalar(text("INSERT INTO auth_event (event, email, occurred_at) "
                                     "VALUES ('login_failed', 'ancien@demo.test', now() - interval '200 days') "
                                     "RETURNING id"))
    try:
        result = subprocess.run([sys.executable, "-m", "app.purge"], cwd=API_DIR, capture_output=True, text=True,
                                timeout=60, check=False)
        assert result.returncode == 0, result.stderr
        assert result.stdout.startswith("[api] purge : ")
        assert "1 événement(s) du journal" in result.stdout and "@" not in result.stdout
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT count(*) FROM auth_event WHERE id = :id"), {"id": old}) == 0
    finally:
        with engine.begin() as connection:
            connection.execute(text("DELETE FROM auth_event WHERE id = :id"), {"id": old})
        engine.dispose()
