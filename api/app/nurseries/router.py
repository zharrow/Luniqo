"""Routes des crèches et des accès du personnel : /api/v2/nurseries/*, /api/v2/staff."""

import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.auth.dependencies import NowDep
from app.auth.models import UserRole
from app.nurseries.dependencies import ManagedNursery, NurseryRepositoryDep, OwnerUser, ReadableNursery, StaffUser
from app.nurseries.models import Nursery, NurseryAccess
from app.nurseries.schemas import EmployeeOut, NurseryCreate, NurseryOut, NurseryUpdate, StaffOut

router = APIRouter(prefix="/api/v2", tags=["crèches"])

_DENIED = {
    status.HTTP_401_UNAUTHORIZED: {"description": "Session absente ou expirée"},
    status.HTTP_403_FORBIDDEN: {"description": "Rôle insuffisant"},
    status.HTTP_404_NOT_FOUND: {"description": "Crèche inexistante ou inaccessible"},
}


@router.get("/nurseries", responses=_DENIED)
async def list_nurseries(user: StaffUser, repo: NurseryRepositoryDep,
                         include_inactive: Annotated[bool, Query()] = False) -> list[NurseryOut]:
    """Crèches accessibles : toutes celles de l'entreprise pour la direction, celles accordées pour un employé."""
    if user.role == UserRole.OWNER:
        nurseries = await repo.list_for_enterprise(user.enterprise_id, include_inactive=include_inactive)
    else:
        nurseries = await repo.list_granted(user.id)
    return [NurseryOut.model_validate(nursery) for nursery in nurseries]


@router.post("/nurseries", status_code=status.HTTP_201_CREATED, responses=_DENIED)
async def create_nursery(body: NurseryCreate, user: OwnerUser, repo: NurseryRepositoryDep) -> NurseryOut:
    """Crée une crèche dans l'entreprise de la direction connectée."""
    nursery = Nursery(id=uuid.uuid4(), enterprise_id=user.enterprise_id, is_active=True, **body.model_dump())
    repo.add(nursery)
    await repo.commit()
    return NurseryOut.model_validate(nursery)


@router.get("/nurseries/{nursery_id}", responses=_DENIED)
async def get_nursery(context: ReadableNursery) -> NurseryOut:
    return NurseryOut.model_validate(context.nursery)


@router.patch("/nurseries/{nursery_id}", responses=_DENIED)
async def update_nursery(body: NurseryUpdate, context: ManagedNursery, repo: NurseryRepositoryDep) -> NurseryOut:
    changes = body.model_dump(exclude_unset=True)
    for required in ("name", "city", "capacity", "is_active"):
        if required in changes and changes[required] is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Le champ {required} ne peut pas être vide")
    for field, value in changes.items():
        setattr(context.nursery, field, value)
    await repo.commit()
    return NurseryOut.model_validate(context.nursery)


@router.get("/nurseries/{nursery_id}/staff", responses=_DENIED)
async def list_nursery_staff(context: ManagedNursery, repo: NurseryRepositoryDep) -> list[StaffOut]:
    """Employés qui ont accès à cette crèche."""
    return [StaffOut.model_validate(employee) for employee in await repo.list_staff(context.nursery.id)]


@router.put("/nurseries/{nursery_id}/staff/{user_id}", status_code=status.HTTP_204_NO_CONTENT, responses=_DENIED)
async def grant_access(user_id: uuid.UUID, context: ManagedNursery, repo: NurseryRepositoryDep, now: NowDep) -> None:
    """Donne à un employé de l'entreprise l'accès à cette crèche. Sans effet s'il l'a déjà."""
    employee = await repo.get_employee(user_id, context.nursery.enterprise_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employé introuvable")
    if not await repo.is_granted(employee.id, context.nursery.id):
        repo.grant(NurseryAccess(user_id=employee.id, nursery_id=context.nursery.id,
                                 enterprise_id=context.nursery.enterprise_id, granted_at=now,
                                 granted_by=context.user.id))
        await repo.commit()


@router.delete("/nurseries/{nursery_id}/staff/{user_id}", status_code=status.HTTP_204_NO_CONTENT, responses=_DENIED)
async def revoke_access(user_id: uuid.UUID, context: ManagedNursery, repo: NurseryRepositoryDep) -> None:
    """Retire l'accès ; effet immédiat, l'accès étant vérifié à chaque requête. Sans effet s'il n'existait pas."""
    if await repo.revoke(user_id, context.nursery.id):
        await repo.commit()


@router.get("/staff", tags=["personnel"], responses=_DENIED)
async def list_employees(user: OwnerUser, repo: NurseryRepositoryDep) -> list[EmployeeOut]:
    """Employés de l'entreprise et crèches auxquelles chacun a accès."""
    employees = await repo.list_employees(user.enterprise_id)
    grants = await repo.grants_of([employee.id for employee in employees])
    return [EmployeeOut(**StaffOut.model_validate(employee).model_dump(), nursery_ids=grants[employee.id])
            for employee in employees]
