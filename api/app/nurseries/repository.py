"""Accès aux données des crèches. Implémentation en mémoire pour les tests : tests/nurseries/fakes.py."""

import uuid
from datetime import date
from typing import Protocol

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attendance.models import Attendance
from app.attendance.policy import CAN_ATTEND
from app.auth.models import AppUser, UserRole
from app.children.models import Child
from app.nurseries.models import Nursery, NurseryAccess
from app.nurseries.policy import OnboardingFacts, StaffAccess, Tablet
from app.nurseries.schemas import NurserySummary
from app.tablets.models import TabletDevice


class NurseryRepository(Protocol):
    async def get(self, nursery_id: uuid.UUID) -> Nursery | None: ...
    async def get_summary(self, nursery_id: uuid.UUID, day: date) -> NurserySummary: ...
    async def get_onboarding_facts(self, nursery_id: uuid.UUID) -> OnboardingFacts: ...
    async def list_for_enterprise(self, enterprise_id: uuid.UUID, *, include_inactive: bool) -> list[Nursery]: ...
    async def list_granted(self, user_id: uuid.UUID) -> list[Nursery]: ...
    async def is_granted(self, user_id: uuid.UUID, nursery_id: uuid.UUID) -> bool: ...
    def add(self, nursery: Nursery) -> None: ...
    async def get_employee(self, user_id: uuid.UUID, enterprise_id: uuid.UUID) -> AppUser | None: ...
    async def list_employees(self, enterprise_id: uuid.UUID) -> list[AppUser]: ...
    async def list_staff(self, nursery_id: uuid.UUID) -> list[AppUser]: ...
    async def grants_of(self, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[uuid.UUID]]: ...
    def grant(self, access: NurseryAccess) -> None: ...
    async def revoke(self, user_id: uuid.UUID, nursery_id: uuid.UUID) -> bool: ...
    async def commit(self) -> None: ...


class SqlNurseryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, nursery_id: uuid.UUID) -> Nursery | None:
        return await self.session.get(Nursery, nursery_id)

    async def get_summary(self, nursery_id: uuid.UUID, day: date) -> NurserySummary:
        # Trois sous-requêtes indépendantes : une seule lecture, sans multiplier
        # les enfants par leurs présences ou les accès du personnel.
        children = select(func.count()).select_from(Child).where(
            Child.nursery_id == nursery_id, Child.status.in_(CAN_ATTEND))
        present = select(func.count()).select_from(Attendance).where(
            Attendance.nursery_id == nursery_id, Attendance.day == day, Attendance.departed_at.is_(None))
        staff = select(func.count()).select_from(AppUser).join(
            NurseryAccess, NurseryAccess.user_id == AppUser.id).where(
                NurseryAccess.nursery_id == nursery_id, AppUser.role == UserRole.EMPLOYEE, AppUser.is_active)
        row = (await self.session.execute(select(
            children.scalar_subquery().label("children"),
            present.scalar_subquery().label("present"),
            staff.scalar_subquery().label("staff"),
        ))).one()
        return NurserySummary(**row._mapping)

    async def get_onboarding_facts(self, nursery_id: uuid.UUID) -> OnboardingFacts:
        # Les faits bruts : les règles (employé actif, tablette valable, plus
        # ancienne date) sont dans policy.py. Accès et tablettes d'une crèche
        # restent peu nombreux ; les présences, elles, sont réduites en base.
        accesses = await self.session.execute(
            select(NurseryAccess.granted_at, AppUser.is_active)
            .join(AppUser, AppUser.id == NurseryAccess.user_id)
            .where(NurseryAccess.nursery_id == nursery_id, AppUser.role == UserRole.EMPLOYEE))
        tablets = await self.session.execute(
            select(TabletDevice.created_at, TabletDevice.expires_at, TabletDevice.revoked_at)
            .where(TabletDevice.nursery_id == nursery_id, TabletDevice.revoked_at.is_(None)))
        first_arrival = await self.session.scalar(
            select(func.min(Attendance.arrived_at)).where(Attendance.nursery_id == nursery_id))
        return OnboardingFacts(
            accesses=[StaffAccess(granted_at, active) for granted_at, active in accesses],
            tablets=[Tablet(created_at, expires_at, revoked_at) for created_at, expires_at, revoked_at in tablets],
            first_arrival=first_arrival,
        )

    async def list_for_enterprise(self, enterprise_id: uuid.UUID, *, include_inactive: bool) -> list[Nursery]:
        statement = select(Nursery).where(Nursery.enterprise_id == enterprise_id).order_by(Nursery.name)
        if not include_inactive:
            statement = statement.where(Nursery.is_active)
        return list(await self.session.scalars(statement))

    async def list_granted(self, user_id: uuid.UUID) -> list[Nursery]:
        statement = (
            select(Nursery)
            .join(NurseryAccess, NurseryAccess.nursery_id == Nursery.id)
            .where(NurseryAccess.user_id == user_id, Nursery.is_active)
            .order_by(Nursery.name)
        )
        return list(await self.session.scalars(statement))

    async def is_granted(self, user_id: uuid.UUID, nursery_id: uuid.UUID) -> bool:
        return await self.session.get(NurseryAccess, (user_id, nursery_id)) is not None

    def add(self, nursery: Nursery) -> None:
        self.session.add(nursery)

    async def get_employee(self, user_id: uuid.UUID, enterprise_id: uuid.UUID) -> AppUser | None:
        return await self.session.scalar(select(AppUser).where(
            AppUser.id == user_id, AppUser.enterprise_id == enterprise_id, AppUser.role == UserRole.EMPLOYEE))

    async def list_employees(self, enterprise_id: uuid.UUID) -> list[AppUser]:
        statement = (
            select(AppUser)
            .where(AppUser.enterprise_id == enterprise_id, AppUser.role == UserRole.EMPLOYEE)
            .order_by(AppUser.last_name, AppUser.first_name)
        )
        return list(await self.session.scalars(statement))

    async def list_staff(self, nursery_id: uuid.UUID) -> list[AppUser]:
        statement = (
            select(AppUser)
            .join(NurseryAccess, NurseryAccess.user_id == AppUser.id)
            .where(NurseryAccess.nursery_id == nursery_id)
            .order_by(AppUser.last_name, AppUser.first_name)
        )
        return list(await self.session.scalars(statement))

    async def grants_of(self, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[uuid.UUID]]:
        grants: dict[uuid.UUID, list[uuid.UUID]] = {user_id: [] for user_id in user_ids}
        if user_ids:
            rows = await self.session.execute(
                select(NurseryAccess.user_id, NurseryAccess.nursery_id).where(NurseryAccess.user_id.in_(user_ids)))
            for user_id, nursery_id in rows:
                grants[user_id].append(nursery_id)
        return grants

    def grant(self, access: NurseryAccess) -> None:
        self.session.add(access)

    async def revoke(self, user_id: uuid.UUID, nursery_id: uuid.UUID) -> bool:
        result = await self.session.execute(delete(NurseryAccess).where(
            NurseryAccess.user_id == user_id, NurseryAccess.nursery_id == nursery_id))
        return result.rowcount > 0

    async def commit(self) -> None:
        await self.session.commit()
