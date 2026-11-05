"""Routes du pointage.

- Tablette (`/api/v2/tablet/children…`) : employé identifié par PIN (`CurrentActor`),
  crèche de la tablette seulement. C'est là que l'on pointe.
- Web (`/api/v2/nurseries/{id}/attendance…`) : suivi des présences, en lecture,
  pour la direction et les employés ayant accès à la crèche.
- Corrections (LUN-120) : direction seulement (`ManagedNursery`), motif obligatoire,
  chaque correction écrite dans un journal qui ne se modifie pas.
"""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.attendance import policy, service
from app.attendance.schemas import (
    ArrivalIn,
    AttendanceOut,
    CorrectionOut,
    DepartureIn,
    PresenceCancel,
    PresenceCreate,
    PresenceUpdate,
    TabletChild,
    TabletGuardian,
)
from app.auth.dependencies import NowDep
from app.db import SessionDep
from app.exports import BAD_RANGE, FromQuery, ToQuery, csv_cell, csv_response, csv_responses, history_range, local_time
from app.nurseries.dependencies import ManagedNursery, ReadableNursery
from app.openapi import error_responses
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
    # Corrections (LUN-120)
    "presence_not_found": (status.HTTP_404_NOT_FOUND, "Présence introuvable dans cette crèche"),
    "no_change": (status.HTTP_422_UNPROCESSABLE_CONTENT, "La correction ne change rien"),
    "arrival_required": (status.HTTP_422_UNPROCESSABLE_CONTENT, "L'heure d'arrivée ne peut pas être retirée"),
    "pickup_without_departure": (status.HTTP_422_UNPROCESSABLE_CONTENT,
                                 "Une personne venue chercher l'enfant suppose une heure de départ"),
    "too_old": (status.HTTP_409_CONFLICT,
                f"Présence de plus de {policy.CORRECTION_MAX_DAYS} jours : elle ne se corrige plus"),
    "arrival_other_day": (status.HTTP_422_UNPROCESSABLE_CONTENT, "L'arrivée doit rester le jour de la présence"),
    "departure_before_arrival": (status.HTTP_422_UNPROCESSABLE_CONTENT, "Le départ précède l'arrivée"),
    "departure_other_day": (status.HTTP_422_UNPROCESSABLE_CONTENT, "Le départ doit être le jour de l'arrivée"),
    "in_future": (status.HTTP_422_UNPROCESSABLE_CONTENT, "Une heure corrigée ne peut pas être dans le futur"),
    "open_in_past": (status.HTTP_422_UNPROCESSABLE_CONTENT,
                     "Une présence d'un jour passé doit avoir une heure de départ"),
    "overlap": (status.HTTP_409_CONFLICT, "Cette présence chevauche une autre présence de l'enfant ce jour-là"),
}


def _errors(*reasons: str) -> dict:
    return error_responses(*(_REFUSALS[reason] for reason in reasons))


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


@router.post("/tablet/children/{child_id}/arrival", status_code=status.HTTP_201_CREATED,
             responses=_errors("not_found", "not_expected", "already_present", "unknown_guardian"))
async def tablet_arrival(child_id: uuid.UUID, body: ArrivalIn, actor: CurrentActor, db: SessionDep,
                         now: NowDep) -> AttendanceOut:
    """Pointe l'arrivée, à l'heure du serveur (pas d'heure saisie sur la tablette)."""
    try:
        presence = await service.arrive(db, actor.tablet.nursery.id, child_id, actor.user, now, body.dropped_off_by)
    except service.AttendanceRefused as refusal:
        raise _refused(refusal) from None
    return AttendanceOut.of(presence)


@router.post("/tablet/children/{child_id}/departure",
             responses=_errors("not_found", "not_present", "pickup_not_authorized"))
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


async def _period(context, db, now, start: date | None, end: date | None) -> tuple[date, date, list[service.Presence]]:
    try:
        start, end = history_range(start, end, policy.local_day(now))
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from None
    return start, end, await service.period_presences(db, context.nursery.id, start, end)


@router.get("/nurseries/{nursery_id}/attendance/history", responses=error_responses(*BAD_RANGE))
async def attendance_history(context: ReadableNursery, db: SessionDep, now: NowDep, start: FromQuery = None,
                             end: ToQuery = None) -> list[AttendanceOut]:
    """Présences sur une période (366 jours au plus), par jour puis par heure d'arrivée."""
    _, _, presences = await _period(context, db, now, start, end)
    return [AttendanceOut.of(presence) for presence in presences]


@router.get("/nurseries/{nursery_id}/attendance/history.csv", response_class=Response,
            responses=csv_responses("Présences au format CSV (tableur)", *BAD_RANGE))
async def attendance_history_csv(context: ReadableNursery, db: SessionDep, now: NowDep, start: FromQuery = None,
                                 end: ToQuery = None) -> Response:
    """Mêmes lignes que l'historique, à ouvrir dans un tableur (contrôle, facturation, déclaration).

    Séparateur « ; » et BOM UTF-8 : un tableur réglé en français l'ouvre avec ses accents. Heures en heure de Paris.
    """
    start, end, presences = await _period(context, db, now, start, end)
    rows = []
    for presence in presences:
        out = AttendanceOut.of(presence)
        rows.append([out.day.strftime("%d/%m/%Y"), csv_cell(out.child_name), local_time(out.arrived_at),
                     csv_cell(out.arrival_by), csv_cell(out.dropped_off_by), local_time(out.departed_at),
                     csv_cell(out.departure_by), csv_cell(out.picked_up_by), "oui" if out.corrected else ""])
    header = ["Jour", "Enfant", "Arrivée", "Arrivée pointée par", "Amené·e par", "Départ", "Départ pointé par",
              "Parti·e avec", "Corrigé"]
    return csv_response(header, rows, f"presences_{start.isoformat()}_{end.isoformat()}.csv")


# --- Corrections par la direction (LUN-120) ------------------------------------

_TIME_REFUSALS = ("too_old", "arrival_other_day", "departure_before_arrival", "departure_other_day", "in_future",
                  "open_in_past", "overlap")


@router.post("/nurseries/{nursery_id}/attendance", status_code=status.HTTP_201_CREATED,
             responses=_errors("not_found", "not_expected", "already_present", "unknown_guardian",
                               "pickup_not_authorized", "pickup_without_departure", *_TIME_REFUSALS))
async def add_presence(body: PresenceCreate, context: ManagedNursery, db: SessionDep, now: NowDep) -> AttendanceOut:
    """Ajoute une présence oubliée sur la tablette (direction seulement, motif obligatoire)."""
    try:
        presence = await service.add_presence(db, context.nursery.id, body.child_id, context.user, now, body.reason,
                                              body.arrived_at, body.departed_at, body.dropped_off_by,
                                              body.picked_up_by)
    except service.AttendanceRefused as refusal:
        raise _refused(refusal) from None
    return AttendanceOut.of(presence)


@router.patch("/nurseries/{nursery_id}/attendance/{attendance_id}",
              responses=_errors("presence_not_found", "no_change", "arrival_required", "already_present",
                                "unknown_guardian", "pickup_not_authorized", "pickup_without_departure",
                                *_TIME_REFUSALS))
async def correct_presence(attendance_id: uuid.UUID, body: PresenceUpdate, context: ManagedNursery,
                           db: SessionDep, now: NowDep) -> AttendanceOut:
    """Corrige une présence : départ oublié, heure erronée, personne qui a amené ou cherché l'enfant.

    Seuls les champs envoyés changent ; le jour de la présence, lui, ne change jamais.
    """
    try:
        presence = await service.correct_presence(db, context.nursery.id, attendance_id, context.user, now,
                                                  body.reason, body.changes())
    except service.AttendanceRefused as refusal:
        raise _refused(refusal) from None
    return AttendanceOut.of(presence)


@router.post("/nurseries/{nursery_id}/attendance/{attendance_id}/cancel",
             responses=_errors("presence_not_found", "too_old"))
async def cancel_presence(attendance_id: uuid.UUID, body: PresenceCancel, context: ManagedNursery, db: SessionDep,
                          now: NowDep) -> CorrectionOut:
    """Retire une présence pointée par erreur (sur le mauvais enfant). Le journal garde ce qu'elle contenait."""
    try:
        entry = await service.cancel_presence(db, context.nursery.id, attendance_id, context.user, now, body.reason)
    except service.AttendanceRefused as refusal:
        raise _refused(refusal) from None
    return CorrectionOut.of(entry)


@router.get("/nurseries/{nursery_id}/attendance/corrections", responses=error_responses(*BAD_RANGE))
async def attendance_corrections(context: ManagedNursery, db: SessionDep, now: NowDep, start: FromQuery = None,
                                 end: ToQuery = None) -> list[CorrectionOut]:
    """Journal des corrections des présences d'une période (jour de la présence), dans l'ordre où elles ont eu lieu."""
    try:
        start, end = history_range(start, end, policy.local_day(now))
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from None
    return [CorrectionOut.of(entry) for entry in await service.corrections_between(db, context.nursery.id, start, end)]
