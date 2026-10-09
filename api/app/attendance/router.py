"""Routes du pointage.

- Tablette (`/api/v2/tablet/children…`) : employé identifié par PIN (`CurrentActor`),
  crèche de la tablette seulement. C'est là que l'on pointe.
- Web (`/api/v2/nurseries/{id}/attendance…`) : suivi des présences, en lecture,
  pour la direction et les employés ayant accès à la crèche.
"""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.attendance import policy, service
from app.attendance.schemas import ArrivalIn, AttendanceOut, DepartureIn, TabletChild, TabletGuardian
from app.auth.dependencies import NowDep
from app.db import SessionDep
from app.nurseries.dependencies import ReadableNursery
from app.tablets.dependencies import CurrentActor

router = APIRouter(prefix="/api/v2", tags=["pointage"])

_REFUSALS = {
    "not_found": (status.HTTP_404_NOT_FOUND, "Enfant introuvable dans cette crèche"),
    "not_expected": (status.HTTP_409_CONFLICT, "Enfant non attendu (suspendu, parti ou pas encore inscrit)"),
    "already_present": (status.HTTP_409_CONFLICT, "Arrivée déjà pointée"),
    "not_present": (status.HTTP_409_CONFLICT, "Aucune arrivée pointée pour cet enfant"),
    "unknown_guardian": (status.HTTP_422_UNPROCESSABLE_CONTENT, "Cette personne n'est pas un responsable de l'enfant"),
    "pickup_not_authorized": (status.HTTP_403_FORBIDDEN,
                              "Cette personne n'est pas autorisée à venir chercher l'enfant : prévenir la direction"),
}


def _refused(refusal: service.AttendanceRefused) -> HTTPException:
    code, message = _REFUSALS[refusal.reason]
    return HTTPException(code, message)


# --- Tablette ------------------------------------------------------------------

@router.get("/tablet/children")
async def tablet_children(actor: CurrentActor, db: SessionDep, now: NowDep) -> list[TabletChild]:
    """Enfants attendus aujourd'hui dans la crèche de la tablette, avec leur état de présence."""
    nursery_id, day = actor.tablet.nursery.id, policy.local_day(now)
    children = await service.expected_children(db, nursery_id, day)
    guardians = await service.guardians_of(db, [child.id for child in children])
    today = await service.today_by_child(db, nursery_id, day)
    result = []
    for child in children:
        latest = today.get(child.id)
        presence = "absent" if latest is None else ("present" if latest.departed_at is None else "left")
        result.append(TabletChild(
            id=child.id, first_name=child.first_name, last_name=child.last_name, presence=presence,
            arrived_at=latest.arrived_at if latest else None, departed_at=latest.departed_at if latest else None,
            guardians=[TabletGuardian.of(guardian, link.relationship, link.is_authorized_pickup)
                       for link, guardian in guardians[child.id]]))
    return result


@router.post("/tablet/children/{child_id}/arrival", status_code=status.HTTP_201_CREATED)
async def tablet_arrival(child_id: uuid.UUID, body: ArrivalIn, actor: CurrentActor, db: SessionDep,
                         now: NowDep) -> AttendanceOut:
    """Pointe l'arrivée, à l'heure du serveur (pas d'heure saisie sur la tablette)."""
    try:
        presence = await service.arrive(db, actor.tablet.nursery.id, child_id, actor.user, now, body.dropped_off_by)
    except service.AttendanceRefused as refusal:
        raise _refused(refusal) from None
    return AttendanceOut.of(presence)


@router.post("/tablet/children/{child_id}/departure")
async def tablet_departure(child_id: uuid.UUID, body: DepartureIn, actor: CurrentActor, db: SessionDep,
                           now: NowDep) -> AttendanceOut:
    """Pointe le départ avec la personne venue chercher l'enfant, qui doit être autorisée pour lui."""
    try:
        presence = await service.depart(db, actor.tablet.nursery.id, child_id, actor.user, now, body.picked_up_by)
    except service.AttendanceRefused as refusal:
        raise _refused(refusal) from None
    return AttendanceOut.of(presence)


# --- Suivi (web) -----------------------------------------------------------------

@router.get("/nurseries/{nursery_id}/attendance")
async def day_attendance(context: ReadableNursery, db: SessionDep, now: NowDep,
                         day: Annotated[date | None, Query()] = None) -> list[AttendanceOut]:
    """Présences d'un jour (aujourd'hui, heure de Paris, par défaut)."""
    presences = await service.day_presences(db, context.nursery.id, day or policy.local_day(now))
    return [AttendanceOut.of(presence) for presence in presences]


@router.get("/nurseries/{nursery_id}/attendance/present")
async def present_children(context: ReadableNursery, db: SessionDep) -> list[AttendanceOut]:
    """Enfants présents en ce moment (arrivée pointée, départ non pointé)."""
    return [AttendanceOut.of(presence) for presence in await service.present_now(db, context.nursery.id)]
