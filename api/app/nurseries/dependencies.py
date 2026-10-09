"""Contrôle d'accès des routes de crèche : point unique, appliqué par dépendance.

Une route qui prend une crèche en paramètre déclare `ReadableNursery` ou
`ManagedNursery` au lieu de lire la crèche elle-même : elle ne peut pas
oublier la vérification.

Une crèche à laquelle l'utilisateur n'a aucun accès répond 404, comme une
crèche inexistante : on ne révèle pas qu'elle existe dans une autre
entreprise. Un employé qui lit une crèche mais tente de la gérer reçoit 403.
"""

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.auth.dependencies import CurrentUser
from app.auth.models import AppUser, UserRole
from app.db import SessionDep
from app.nurseries.access import Access, nursery_access
from app.nurseries.models import Nursery
from app.nurseries.repository import NurseryRepository, SqlNurseryRepository


async def get_nursery_repository(session: SessionDep) -> NurseryRepository:
    return SqlNurseryRepository(session)


NurseryRepositoryDep = Annotated[NurseryRepository, Depends(get_nursery_repository)]


def require_role(*roles: UserRole) -> Callable[[AppUser], Awaitable[AppUser]]:
    async def dependency(user: CurrentUser) -> AppUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Action non autorisée pour ce rôle")
        return user

    return dependency


StaffUser = Annotated[AppUser, Depends(require_role(UserRole.OWNER, UserRole.EMPLOYEE))]
OwnerUser = Annotated[AppUser, Depends(require_role(UserRole.OWNER))]
GuardianUser = Annotated[AppUser, Depends(require_role(UserRole.GUARDIAN))]


@dataclass(frozen=True)
class NurseryContext:
    nursery: Nursery
    user: AppUser
    access: Access


async def readable_nursery(nursery_id: uuid.UUID, user: StaffUser, repo: NurseryRepositoryDep) -> NurseryContext:
    nursery = await repo.get(nursery_id)
    if nursery is not None:
        granted = user.role == UserRole.EMPLOYEE and await repo.is_granted(user.id, nursery.id)
        access = nursery_access(user, nursery, granted=granted)
        if access >= Access.READ:
            return NurseryContext(nursery, user, access)
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Crèche introuvable")


async def managed_nursery(context: Annotated[NurseryContext, Depends(readable_nursery)]) -> NurseryContext:
    if context.access < Access.MANAGE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Seule la direction peut gérer cette crèche")
    return context


ReadableNursery = Annotated[NurseryContext, Depends(readable_nursery)]
ManagedNursery = Annotated[NurseryContext, Depends(managed_nursery)]
