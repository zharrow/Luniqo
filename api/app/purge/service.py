"""Suppression de ce qui a dépassé sa durée de conservation (règles : policy.py).

Idempotente : relancée sans rien d'expiré, elle ne supprime rien. Une seule
transaction : en cas d'erreur, rien n'est supprimé.
"""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import Delete, and_, delete, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.accounts.models import StaffInvitation
from app.auth.models import AuthEvent, SessionKind, UserSession
from app.family.models import Invitation
from app.passkeys.models import WebauthnChallenge
from app.purge import policy


@dataclass(frozen=True)
class PurgeReport:
    sessions: int
    auth_events: int
    staff_invitations: int
    family_invitations: int
    webauthn_challenges: int


async def _delete(db: AsyncSession, statement: Delete) -> int:
    # Aucun objet chargé à synchroniser : la purge tourne dans son propre processus.
    result = await db.execute(statement.execution_options(synchronize_session=False))
    return result.rowcount


async def purge(db: AsyncSession, now: datetime) -> PurgeReport:
    limit = policy.cutoffs(now)
    report = PurgeReport(
        sessions=await _delete(db, delete(UserSession).where(or_(
            and_(UserSession.kind == SessionKind.WEB.value,
                 or_(UserSession.last_seen_at <= limit.web_session_seen,
                     UserSession.created_at <= limit.web_session_created)),
            and_(UserSession.kind == SessionKind.TABLET.value,
                 UserSession.created_at <= limit.tablet_session_created),
        ))),
        auth_events=await _delete(db, delete(AuthEvent).where(AuthEvent.occurred_at <= limit.auth_event)),
        staff_invitations=await _delete(db, delete(StaffInvitation).where(
            StaffInvitation.expires_at <= limit.invitation_expires)),
        family_invitations=await _delete(db, delete(Invitation).where(
            Invitation.expires_at <= limit.invitation_expires)),
        # Défi de passkey non présenté dans le délai : il ne vaut déjà plus rien.
        webauthn_challenges=await _delete(db, delete(WebauthnChallenge).where(
            WebauthnChallenge.expires_at <= limit.challenge_expires)),
    )
    await db.commit()
    return report
