"""Routes des crèches et des accès du personnel : /api/v2/nurseries/*, /api/v2/staff."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.attendance.policy import local_day
from app.auth.dependencies import NowDep
from app.auth.models import UserRole
from app.errors import ApiError, ErrorSpec, required_field
from app.nurseries.dependencies import ManagedNursery, NurseryRepositoryDep, OwnerUser, ReadableNursery, StaffUser
from app.nurseries.models import Nursery, NurseryAccess
from app.nurseries.policy import achievements
from app.nurseries.schemas import (
    EmployeeOut,
    NurseryCreate,
    NurseryOnboarding,
    NurseryOut,
    NurserySummary,
    NurseryUpdate,
    OnboardingStepOut,
    StaffOut,
)
from app.openapi import error_responses

router = APIRouter(prefix="/api/v2", tags=["crèches"])

_EMPLOYEE_NOT_FOUND = ErrorSpec(status.HTTP_404_NOT_FOUND, "employee_not_found", "Employé introuvable")


@router.get("/nurseries")
async def list_nurseries(user: StaffUser, repo: NurseryRepositoryDep,
                         include_inactive: Annotated[bool, Query()] = False) -> list[NurseryOut]:
    """Crèches accessibles : toutes celles de l'entreprise pour la direction, celles accordées pour un employé."""
    if user.role == UserRole.OWNER:
        nurseries = await repo.list_for_enterprise(user.enterprise_id, include_inactive=include_inactive)
    else:
        nurseries = await repo.list_granted(user.id)
    return [NurseryOut.model_validate(nursery) for nursery in nurseries]


@router.post("/nurseries", status_code=status.HTTP_201_CREATED)
async def create_nursery(body: NurseryCreate, user: OwnerUser, repo: NurseryRepositoryDep) -> NurseryOut:
    """Crée une crèche dans l'entreprise de la direction connectée."""
    nursery = Nursery(id=uuid.uuid4(), enterprise_id=user.enterprise_id, is_active=True, **body.model_dump())
    repo.add(nursery)
    await repo.commit()
    return NurseryOut.model_validate(nursery)


@router.get("/nurseries/{nursery_id}")
async def get_nursery(context: ReadableNursery) -> NurseryOut:
    """Une crèche : celles de l'entreprise pour la direction, celles accordées pour un employé."""
    return NurseryOut.model_validate(context.nursery)


@router.get("/nurseries/{nursery_id}/summary")
async def get_nursery_summary(context: ReadableNursery, repo: NurseryRepositoryDep, now: NowDep) -> NurserySummary:
    """Résumé de la crèche : enfants accueillis, présents aujourd'hui à Paris et personnel actif.

    « Accueillis » suit les statuts CAN_ATTEND (active et adaptation).
    « Présents » compte les arrivées du jour sans départ ; une présence annulée
    est retirée du pointage et ne compte plus. Le personnel comprend uniquement
    les employés actifs ayant un accès à cette crèche.
    """
    return await repo.get_summary(context.nursery.id, local_day(now))


@router.get("/nurseries/{nursery_id}/onboarding")
async def get_nursery_onboarding(context: ManagedNursery, repo: NurseryRepositoryDep, now: NowDep) -> NurseryOnboarding:
    """Mise en route de la crèche, pour la direction : personnel, tablette, premier pointage.

    Chaque succès est daté de sa plus ancienne preuve encore valable et se perd
    si sa condition disparaît (employé parti, tablette révoquée ou expirée).
    """
    facts = await repo.get_onboarding_facts(context.nursery.id)
    return NurseryOnboarding(steps=[
        OnboardingStepOut(milestone=a.milestone, achieved=a.achieved, achieved_at=a.achieved_at)
        for a in achievements(facts, now)])


@router.patch("/nurseries/{nursery_id}")
async def update_nursery(body: NurseryUpdate, context: ManagedNursery, repo: NurseryRepositoryDep) -> NurseryOut:
    """Modifie la crèche ; seuls les champs envoyés changent. `is_active: false` la ferme (tablettes comprises)."""
    changes = body.model_dump(exclude_unset=True)
    for required in ("name", "city", "capacity", "is_active"):
        if required in changes and changes[required] is None:
            raise required_field(required)
    for field, value in changes.items():
        setattr(context.nursery, field, value)
    await repo.commit()
    return NurseryOut.model_validate(context.nursery)


@router.get("/nurseries/{nursery_id}/staff")
async def list_nursery_staff(context: ManagedNursery, repo: NurseryRepositoryDep) -> list[StaffOut]:
    """Employés qui ont accès à cette crèche."""
    return [StaffOut.model_validate(employee) for employee in await repo.list_staff(context.nursery.id)]


@router.put("/nurseries/{nursery_id}/staff/{user_id}", status_code=status.HTTP_204_NO_CONTENT,
            responses=error_responses(_EMPLOYEE_NOT_FOUND))
async def grant_access(user_id: uuid.UUID, context: ManagedNursery, repo: NurseryRepositoryDep, now: NowDep) -> None:
    """Donne à un employé de l'entreprise l'accès à cette crèche. Sans effet s'il l'a déjà."""
    employee = await repo.get_employee(user_id, context.nursery.enterprise_id)
    if employee is None:
        raise ApiError(_EMPLOYEE_NOT_FOUND)
    if not await repo.is_granted(employee.id, context.nursery.id):
        repo.grant(NurseryAccess(user_id=employee.id, nursery_id=context.nursery.id,
                                 enterprise_id=context.nursery.enterprise_id, granted_at=now,
                                 granted_by=context.user.id))
        await repo.commit()


@router.delete("/nurseries/{nursery_id}/staff/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_access(user_id: uuid.UUID, context: ManagedNursery, repo: NurseryRepositoryDep) -> None:
    """Retire l'accès ; effet immédiat, l'accès étant vérifié à chaque requête. Sans effet s'il n'existait pas."""
    if await repo.revoke(user_id, context.nursery.id):
        await repo.commit()


@router.get("/staff", tags=["personnel"])
async def list_employees(user: OwnerUser, repo: NurseryRepositoryDep) -> list[EmployeeOut]:
    """Employés de l'entreprise et crèches auxquelles chacun a accès."""
    employees = await repo.list_employees(user.enterprise_id)
    grants = await repo.grants_of([employee.id for employee in employees])
    return [EmployeeOut(**StaffOut.model_validate(employee).model_dump(), nursery_ids=grants[employee.id])
            for employee in employees]
