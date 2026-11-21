"""Dépôt « À traiter » en mémoire, conforme au contrat ToDoRepository.

Il ne rend que les faits des crèches demandées, comme le dépôt SQL ; il ne
réduit pas la lecture aux fenêtres de dates : les règles de policy.py
doivent écarter seules ce qui est hors délai.
"""

import uuid
from datetime import UTC, date, datetime

from app.nurseries.models import Nursery
from app.nurseries.policy import OnboardingFacts, StaffAccess, Tablet
from app.todo.policy import LockedPin, NurseryOnboardingFacts, NurseryRef, OpenPresence, TabletFact

_LONG_AGO = datetime(2026, 1, 5, 8, 0, tzinfo=UTC)
# Mise en route terminée (personnel, tablette valable jusqu'en 2100, premier pointage) : rien à signaler.
COMPLETE = OnboardingFacts(accesses=[StaffAccess(_LONG_AGO, True)],
                           tablets=[Tablet(_LONG_AGO, datetime(2100, 1, 1, tzinfo=UTC), None)],
                           first_arrival=_LONG_AGO)
INCOMPLETE = OnboardingFacts(accesses=[], tablets=[], first_arrival=None)


class InMemoryToDoRepository:
    def __init__(self) -> None:
        self.pins: list[LockedPin] = []
        self.tablet_facts: list[TabletFact] = []
        self.presences: list[OpenPresence] = []
        # Par défaut, mise en route terminée : un test ne voit que ce qu'il prépare.
        self.onboarding_facts: dict[uuid.UUID, OnboardingFacts] = {}
        self.read: list[uuid.UUID] = []

    @staticmethod
    def _ids(nurseries: list[NurseryRef]) -> set[uuid.UUID]:
        return {ref.id for ref in nurseries}

    async def locked_pins(self, nurseries: list[NurseryRef]) -> list[LockedPin]:
        return [fact for fact in self.pins if fact.nursery.id in self._ids(nurseries)]

    async def tablets(self, nurseries: list[NurseryRef], expiring_from: datetime,
                      expiring_to: datetime) -> list[TabletFact]:
        return [fact for fact in self.tablet_facts if fact.nursery.id in self._ids(nurseries)]

    async def open_presences(self, nurseries: list[NurseryRef], first_day: date,
                             last_day: date) -> list[OpenPresence]:
        return [fact for fact in self.presences if fact.nursery.id in self._ids(nurseries)]

    async def onboarding(self, nursery: Nursery) -> NurseryOnboardingFacts:
        self.read.append(nursery.id)
        facts = self.onboarding_facts.get(nursery.id, COMPLETE)
        return NurseryOnboardingFacts(NurseryRef(nursery.id, nursery.name), nursery.created_at, facts)
