"""Transmissions de la journée (LUN-146) : direction et employés ayant accès à la crèche (`ReadableNursery`).

Les familles n'y ont pas accès (portail, hors périmètre). Pas de donnée de santé : LUN-57.
"""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.attendance.policy import local_day
from app.attendance.service import full_name
from app.auth.dependencies import NowDep
from app.db import SessionDep
from app.errors import ApiError, ErrorSpec
from app.notes import service
from app.notes.schemas import NoteCreate, NoteOut
from app.nurseries.dependencies import ReadableNursery
from app.openapi import error_responses

router = APIRouter(prefix="/api/v2", tags=["transmissions"])

CHILD_NOT_FOUND = ErrorSpec(status.HTTP_404_NOT_FOUND, "child_not_found", "Enfant introuvable dans cette crèche")


@router.post("/nurseries/{nursery_id}/children/{child_id}/notes", status_code=status.HTTP_201_CREATED,
             responses=error_responses(CHILD_NOT_FOUND))
async def add_note(child_id: uuid.UUID, body: NoteCreate, context: ReadableNursery, db: SessionDep,
                   now: NowDep) -> NoteOut:
    """Note une transmission sur un enfant de la crèche (repas, sieste, humeur, ce qu'il faut dire aux parents).

    L'heure, le jour (à Paris) et l'auteur sont fixés par le serveur. Pas d'information médicale
    (allergies, traitements) : les données de santé relèvent de LUN-57.
    """
    try:
        note, child = await service.add_note(db, context.nursery.id, child_id, context.user, now, body.text)
    except service.ChildNotFound:
        raise ApiError(CHILD_NOT_FOUND) from None
    return NoteOut.of(note, full_name(child))


@router.get("/nurseries/{nursery_id}/notes")
async def day_notes(context: ReadableNursery, db: SessionDep, now: NowDep,
                    day: Annotated[date | None, Query(description="Jour à Paris ; aujourd'hui par défaut")] = None,
                    ) -> list[NoteOut]:
    """Transmissions d'un jour de la crèche (aujourd'hui à Paris par défaut), de la plus récente à la plus ancienne."""
    notes = await service.day_notes(db, context.nursery.id, day or local_day(now))
    return [NoteOut.of(note, child_name) for note, child_name in notes]
