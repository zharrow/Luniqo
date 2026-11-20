"""Lecture des faits de la liste « À traiter » (LUN-153). Aucune écriture.

Le dépôt ne lit que les crèches qu'on lui donne (déjà autorisées par la
route) et ne fait que réduire la lecture ; les règles (seuils, employé
actif, tablette révoquée, ordre) sont dans policy.py. Implémentation en
mémoire pour les tests : tests/todo/fakes.py.
"""

from datetime import date, datetime
from typing import Annotated, Protocol

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attendance.models import Attendance
from app.attendance.policy import local_day
from app.auth.models import AppUser, UserRole
from app.children.models import Child
from app.db import SessionDep
from app.nurseries.models import Nursery, NurseryAccess
from app.nurseries.repository import SqlNurseryRepository
from app.tablets.models import TabletDevice
from app.todo import policy
from app.todo.policy import LockedPin, NurseryOnboardingFacts, NurseryRef, OpenPresence, TabletFact, ToDo


def full_name(first_name: str, last_name: str) -> str:
    return " ".join(part for part in (first_name, last_name) if part)


class ToDoRepository(Protocol):
    async def locked_pins(self, nurseries: list[NurseryRef]) -> list[LockedPin]: ...
    async def tablets(self, nurseries: list[NurseryRef], expiring_from: datetime,
                      expiring_to: datetime) -> list[TabletFact]: ...
    async def open_presences(self, nurseries: list[NurseryRef], first_day: date,
                             last_day: date) -> list[OpenPresence]: ...
    async def onboarding(self, nursery: Nursery) -> NurseryOnboardingFacts: ...


class SqlToDoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def locked_pins(self, nurseries: list[NurseryRef]) -> list[LockedPin]:
        # Une ligne par accès : un employé bloqué ayant accès à deux crèches apparaît dans chacune.
        refs = {ref.id: ref for ref in nurseries}
        rows = await self.session.execute(
            select(NurseryAccess.nursery_id, AppUser.id, AppUser.first_name, AppUser.last_name, AppUser.is_active,
                   AppUser.pin_locked_at)
            .join(AppUser, AppUser.id == NurseryAccess.user_id)
            .where(NurseryAccess.nursery_id.in_(refs), AppUser.role == UserRole.EMPLOYEE,
                   AppUser.pin_locked_at.is_not(None)))
        return [LockedPin(refs[nursery_id], user_id, full_name(first, last), active, locked_at)
                for nursery_id, user_id, first, last, active, locked_at in rows]

    async def tablets(self, nurseries: list[NurseryRef], expiring_from: datetime,
                      expiring_to: datetime) -> list[TabletFact]:
        refs = {ref.id: ref for ref in nurseries}
        rows = await self.session.execute(
            select(TabletDevice.nursery_id, TabletDevice.id, TabletDevice.label, TabletDevice.expires_at,
                   TabletDevice.revoked_at)
            .where(TabletDevice.nursery_id.in_(refs), TabletDevice.revoked_at.is_(None),
                   TabletDevice.expires_at.between(expiring_from, expiring_to)))
        return [TabletFact(refs[nursery_id], tablet_id, label, expires_at, revoked_at)
                for nursery_id, tablet_id, label, expires_at, revoked_at in rows]

    async def open_presences(self, nurseries: list[NurseryRef], first_day: date,
                             last_day: date) -> list[OpenPresence]:
        refs = {ref.id: ref for ref in nurseries}
        rows = await self.session.execute(
            select(Attendance.nursery_id, Child.id, Child.first_name, Child.last_name, Attendance.day,
                   Attendance.arrived_at)
            .join(Child, Child.id == Attendance.child_id)
            .where(Attendance.nursery_id.in_(refs), Attendance.departed_at.is_(None),
                   Attendance.day.between(first_day, last_day)))
        return [OpenPresence(refs[nursery_id], child_id, full_name(first, last), day, arrived_at)
                for nursery_id, child_id, first, last, day, arrived_at in rows]

    async def onboarding(self, nursery: Nursery) -> NurseryOnboardingFacts:
        # Mêmes faits que l'écran de mise en route (LUN-128) : une seule définition.
        facts = await SqlNurseryRepository(self.session).get_onboarding_facts(nursery.id)
        return NurseryOnboardingFacts(NurseryRef(nursery.id, nursery.name), nursery.created_at, facts)


async def get_todo_repository(session: SessionDep) -> ToDoRepository:
    return SqlToDoRepository(session)


ToDoRepositoryDep = Annotated[ToDoRepository, Depends(get_todo_repository)]


async def to_do(repo: ToDoRepository, nurseries: list[Nursery], now: datetime) -> list[ToDo]:
    """Éléments à traiter pour ces crèches, triés. `nurseries` : crèches déjà autorisées."""
    if not nurseries:
        return []
    refs = [NurseryRef(nursery.id, nursery.name) for nursery in nurseries]
    expiring_from, expiring_to = policy.tablet_window(now)
    first_day, last_day = policy.departure_window(local_day(now))
    return policy.to_do(
        pins=await repo.locked_pins(refs),
        tablets=await repo.tablets(refs, expiring_from, expiring_to),
        presences=await repo.open_presences(refs, first_day, last_day),
        onboarding=[await repo.onboarding(nursery) for nursery in nurseries],
        now=now,
    )
