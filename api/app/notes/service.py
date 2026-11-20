"""Cas d'usage des transmissions (LUN-146). Routes testées sur PostgreSQL (tests/integration/)."""

import uuid
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attendance.service import full_name, short_name
from app.auth.models import AppUser
from app.children.models import Child
from app.notes import policy
from app.notes.models import ChildNote


class ChildNotFound(Exception):
    """L'enfant n'existe pas dans cette crèche (ou dans aucune)."""


async def add_note(db: AsyncSession, nursery_id: uuid.UUID, child_id: uuid.UUID, author: AppUser, now: datetime,
                   text: str) -> tuple[ChildNote, Child]:
    """Écrit une transmission : jour, heure et auteur viennent du serveur, jamais de l'écran."""
    child = await db.scalar(select(Child).where(Child.id == child_id, Child.nursery_id == nursery_id))
    if child is None:
        raise ChildNotFound
    note = ChildNote(id=uuid.uuid4(), nursery_id=nursery_id, child_id=child.id, day=policy.note_day(now),
                     text=text, author_id=author.id, author_name=short_name(author) or author.email,
                     created_at=now)
    db.add(note)
    await db.commit()
    return note, child


async def day_notes(db: AsyncSession, nursery_id: uuid.UUID, day: date) -> list[tuple[ChildNote, str]]:
    """Transmissions d'un jour de la crèche, de la plus récente à la plus ancienne."""
    rows = await db.execute(
        select(ChildNote, Child)
        .join(Child, (Child.id == ChildNote.child_id) & (Child.nursery_id == ChildNote.nursery_id))
        .where(ChildNote.nursery_id == nursery_id, ChildNote.day == day)
        .order_by(ChildNote.created_at.desc(), ChildNote.id))
    return [(note, full_name(child)) for note, child in rows]
