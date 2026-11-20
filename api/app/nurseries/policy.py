"""Mise en route d'une crèche (LUN-128) : succès obtenus, sans base ni horloge, testés seuls.

Un succès n'est pas un trophée gardé : il est recalculé à chaque lecture et se
perd quand sa condition disparaît (tablette révoquée, employée partie). Sa date
est celle de la plus ancienne preuve encore valable.
"""

import enum
from dataclasses import dataclass
from datetime import datetime


class Milestone(enum.StrEnum):
    """Étapes de la mise en route, dans l'ordre où la direction les franchit d'habitude."""

    STAFF = "staff"
    TABLET = "tablet"
    FIRST_ATTENDANCE = "first_attendance"


@dataclass(frozen=True)
class StaffAccess:
    """Accès d'un employé à la crèche."""

    granted_at: datetime
    employee_active: bool


@dataclass(frozen=True)
class Tablet:
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None


@dataclass(frozen=True)
class OnboardingFacts:
    """Ce que la base sait de la crèche, sans interprétation."""

    accesses: list[StaffAccess]
    tablets: list[Tablet]
    first_arrival: datetime | None


@dataclass(frozen=True)
class Achievement:
    milestone: Milestone
    achieved_at: datetime | None

    @property
    def achieved(self) -> bool:
        return self.achieved_at is not None


def tablet_active(tablet: Tablet, now: datetime) -> bool:
    """Ni révoquée ni expirée, comme l'état « active » de la liste des tablettes."""
    return tablet.revoked_at is None and now < tablet.expires_at


def _earliest(moments: list[datetime]) -> datetime | None:
    return min(moments, default=None)


def achievements(facts: OnboardingFacts, now: datetime) -> list[Achievement]:
    """Succès de la crèche, un par étape, dans l'ordre de `Milestone`."""
    dates = {
        Milestone.STAFF: _earliest([a.granted_at for a in facts.accesses if a.employee_active]),
        Milestone.TABLET: _earliest([t.created_at for t in facts.tablets if tablet_active(t, now)]),
        Milestone.FIRST_ATTENDANCE: facts.first_arrival,
    }
    return [Achievement(milestone, dates[milestone]) for milestone in Milestone]
