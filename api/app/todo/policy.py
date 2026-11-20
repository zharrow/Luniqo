"""Règles de la liste « À traiter » (LUN-153), sans base ni horloge : testées seules.

N'y entre que ce qui demande un geste de la direction (fiche de recherche
docs/recherches/a-traiter-2026-11-20.md). Les seuils viennent de cette fiche,
validée par Florent le 2026-11-20 ; aucune source ne les fixe, ils sont à
revoir avec une crèche pilote.

| Genre | Condition | `since` |
|---|---|---|
| `pin_locked` | employé actif ayant accès à la crèche, PIN bloqué | blocage du PIN |
| `tablet_expired` | tablette non révoquée, expirée depuis 30 jours au plus | expiration |
| `departure_missing` | présence sans départ, d'un jour passé (Paris), 31 jours au plus | arrivée |
| `tablet_expiring` | tablette non révoquée qui expire dans 7 jours au plus | expiration (à venir) |
| `onboarding_incomplete` | une étape de la mise en route (LUN-128) n'est pas franchie | création de la crèche |

Bornes, toutes incluses :
- `tablet_expired` : `expires_at <= now <= expires_at + 30 jours` (expirée à
  l'instant même de `expires_at`, comme `tablet_active`).
- `tablet_expiring` : `now < expires_at <= now + 7 jours`.
- `departure_missing` : `today - 31 jours <= day < today`, `today` étant le
  jour de Paris : la fenêtre de correction de LUN-120 (au-delà, la présence
  ne se corrige plus, la signaler serait une alerte sans geste possible).

Ordre : genre (tableau ci-dessus, du plus urgent au moins urgent), puis le
plus ancien `since` d'abord, puis crèche et sujet pour un ordre stable.
"""

import enum
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from app.attendance.policy import CORRECTION_MAX_DAYS, local_day
from app.nurseries.policy import OnboardingFacts, achievements

TABLET_EXPIRING_DAYS = 7
TABLET_EXPIRED_DAYS = 30
# Fenêtre de correction des présences (LUN-120) : une alerte sans geste possible n'a pas sa place ici.
DEPARTURE_MISSING_DAYS = CORRECTION_MAX_DAYS


class ToDoKind(enum.StrEnum):
    """Genres, du plus urgent au moins urgent : l'ordre de déclaration est l'ordre d'affichage."""

    PIN_LOCKED = "pin_locked"
    TABLET_EXPIRED = "tablet_expired"
    DEPARTURE_MISSING = "departure_missing"
    TABLET_EXPIRING = "tablet_expiring"
    ONBOARDING_INCOMPLETE = "onboarding_incomplete"


_RANK = {kind: rank for rank, kind in enumerate(ToDoKind)}


@dataclass(frozen=True)
class NurseryRef:
    id: uuid.UUID
    name: str


@dataclass(frozen=True)
class LockedPin:
    """Un employé ayant accès à une crèche, avec l'état de son compte et de son PIN."""

    nursery: NurseryRef
    employee_id: uuid.UUID
    employee_name: str
    employee_active: bool
    pin_locked_at: datetime | None


@dataclass(frozen=True)
class TabletFact:
    nursery: NurseryRef
    tablet_id: uuid.UUID
    label: str
    expires_at: datetime
    revoked_at: datetime | None


@dataclass(frozen=True)
class OpenPresence:
    """Une présence sans départ."""

    nursery: NurseryRef
    child_id: uuid.UUID
    child_name: str
    day: date
    arrived_at: datetime


@dataclass(frozen=True)
class NurseryOnboardingFacts:
    nursery: NurseryRef
    created_at: datetime
    facts: OnboardingFacts


@dataclass(frozen=True)
class ToDo:
    kind: ToDoKind
    nursery: NurseryRef
    subject_id: uuid.UUID
    subject_name: str
    since: datetime
    day: date | None = None


def departure_window(today: date) -> tuple[date, date]:
    """Jours (bornes incluses) où une présence sans départ est à signaler."""
    return today - timedelta(days=DEPARTURE_MISSING_DAYS), today - timedelta(days=1)


def tablet_window(now: datetime) -> tuple[datetime, datetime]:
    """Expirations (bornes incluses) qui méritent un signalement : sert à réduire la lecture en base."""
    return now - timedelta(days=TABLET_EXPIRED_DAYS), now + timedelta(days=TABLET_EXPIRING_DAYS)


def pin_item(fact: LockedPin) -> ToDo | None:
    if not fact.employee_active or fact.pin_locked_at is None:
        return None
    return ToDo(ToDoKind.PIN_LOCKED, fact.nursery, fact.employee_id, fact.employee_name, fact.pin_locked_at)


def tablet_kind(expires_at: datetime, revoked_at: datetime | None, now: datetime) -> ToDoKind | None:
    if revoked_at is not None:
        return None
    if expires_at <= now:
        return ToDoKind.TABLET_EXPIRED if now - expires_at <= timedelta(days=TABLET_EXPIRED_DAYS) else None
    return ToDoKind.TABLET_EXPIRING if expires_at - now <= timedelta(days=TABLET_EXPIRING_DAYS) else None


def tablet_item(fact: TabletFact, now: datetime) -> ToDo | None:
    kind = tablet_kind(fact.expires_at, fact.revoked_at, now)
    if kind is None:
        return None
    return ToDo(kind, fact.nursery, fact.tablet_id, fact.label, fact.expires_at)


def departure_item(fact: OpenPresence, now: datetime) -> ToDo | None:
    first, last = departure_window(local_day(now))
    if not first <= fact.day <= last:
        return None
    return ToDo(ToDoKind.DEPARTURE_MISSING, fact.nursery, fact.child_id, fact.child_name, fact.arrived_at, fact.day)


def onboarding_item(fact: NurseryOnboardingFacts, now: datetime) -> ToDo | None:
    if all(step.achieved for step in achievements(fact.facts, now)):
        return None
    return ToDo(ToDoKind.ONBOARDING_INCOMPLETE, fact.nursery, fact.nursery.id, fact.nursery.name, fact.created_at)


def sort_key(item: ToDo) -> tuple:
    return _RANK[item.kind], item.since, item.nursery.name, item.subject_name, str(item.subject_id)


def to_do(*, pins: list[LockedPin], tablets: list[TabletFact], presences: list[OpenPresence],
          onboarding: list[NurseryOnboardingFacts], now: datetime) -> list[ToDo]:
    """Éléments à traiter, triés : genre, puis le plus ancien d'abord."""
    candidates = [
        *(pin_item(fact) for fact in pins),
        *(tablet_item(fact, now) for fact in tablets),
        *(departure_item(fact, now) for fact in presences),
        *(onboarding_item(fact, now) for fact in onboarding),
    ]
    return sorted((item for item in candidates if item is not None), key=sort_key)
