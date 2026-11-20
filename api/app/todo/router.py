"""Route de la liste « À traiter » de la direction : GET /api/v2/to-do (LUN-153)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.auth.dependencies import NowDep
from app.errors import ApiError
from app.nurseries.access import Access, nursery_access
from app.nurseries.dependencies import NURSERY_NOT_FOUND, NurseryRepositoryDep, OwnerUser
from app.openapi import error_responses
from app.todo import service
from app.todo.schemas import ToDoItem, ToDoList
from app.todo.service import ToDoRepositoryDep

router = APIRouter(prefix="/api/v2", tags=["à traiter"])


@router.get("/to-do", responses=error_responses(NURSERY_NOT_FOUND))
async def list_to_do(user: OwnerUser, nurseries: NurseryRepositoryDep, repo: ToDoRepositoryDep, now: NowDep,
                     nursery_id: Annotated[uuid.UUID | None, Query(
                         description="Limiter la liste à cette crèche ; toutes les crèches de la direction sinon")]
                     = None) -> ToDoList:
    """Ce qui demande un geste de la direction, dans toutes ses crèches actives ou dans l'une d'elles.

    PIN bloqués, tablettes expirées, départs non pointés des 31 derniers jours,
    tablettes qui expirent dans 7 jours, mises en route incomplètes : dans cet
    ordre, puis du plus ancien au plus récent. Une crèche fermée n'a rien à
    traiter (liste vide si elle est demandée). Réservée à la direction ; une
    crèche d'une autre entreprise répond 404, comme une crèche inexistante.
    """
    if nursery_id is None:
        scope = await nurseries.list_for_enterprise(user.enterprise_id, include_inactive=False)
    else:
        nursery = await nurseries.get(nursery_id)
        if nursery is None or nursery_access(user, nursery, granted=False) < Access.MANAGE:
            raise ApiError(NURSERY_NOT_FOUND)
        scope = [nursery] if nursery.is_active else []
    items = [ToDoItem.of(item) for item in await service.to_do(repo, scope, now)]
    return ToDoList(items=items, total=len(items))
