"""Dépôt des crèches en mémoire, conforme au contrat NurseryRepository.

Partage les comptes du dépôt d'authentification en mémoire. Reproduit la
contrainte de la base : un accès relie un employé et une crèche de la même
entreprise.
"""

import uuid

from app.auth.models import AppUser, UserRole
from app.nurseries.models import Nursery, NurseryAccess
from tests.auth.fakes import InMemoryAuthRepository


class InMemoryNurseryRepository:
    def __init__(self, auth: InMemoryAuthRepository) -> None:
        self.auth = auth
        self.nurseries: dict[uuid.UUID, Nursery] = {}
        self.accesses: dict[tuple[uuid.UUID, uuid.UUID], NurseryAccess] = {}
        self.commits = 0

    def _users(self) -> list[AppUser]:
        return list(self.auth.users.values())

    async def get(self, nursery_id: uuid.UUID) -> Nursery | None:
        return self.nurseries.get(nursery_id)

    async def list_for_enterprise(self, enterprise_id: uuid.UUID, *, include_inactive: bool) -> list[Nursery]:
        return sorted((n for n in self.nurseries.values()
                       if n.enterprise_id == enterprise_id and (include_inactive or n.is_active)), key=lambda n: n.name)

    async def list_granted(self, user_id: uuid.UUID) -> list[Nursery]:
        return sorted((self.nurseries[nursery_id] for (uid, nursery_id) in self.accesses
                       if uid == user_id and self.nurseries[nursery_id].is_active), key=lambda n: n.name)

    async def is_granted(self, user_id: uuid.UUID, nursery_id: uuid.UUID) -> bool:
        return (user_id, nursery_id) in self.accesses

    def add(self, nursery: Nursery) -> None:
        self.nurseries[nursery.id] = nursery

    async def get_employee(self, user_id: uuid.UUID, enterprise_id: uuid.UUID) -> AppUser | None:
        return next((u for u in self._users() if u.id == user_id and u.enterprise_id == enterprise_id
                     and u.role == UserRole.EMPLOYEE), None)

    async def list_employees(self, enterprise_id: uuid.UUID) -> list[AppUser]:
        return sorted((u for u in self._users() if u.enterprise_id == enterprise_id and u.role == UserRole.EMPLOYEE),
                      key=lambda u: (u.last_name, u.first_name))

    async def list_staff(self, nursery_id: uuid.UUID) -> list[AppUser]:
        ids = {uid for (uid, nid) in self.accesses if nid == nursery_id}
        return sorted((u for u in self._users() if u.id in ids), key=lambda u: (u.last_name, u.first_name))

    async def grants_of(self, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[uuid.UUID]]:
        return {uid: [nid for (u, nid) in self.accesses if u == uid] for uid in user_ids}

    def grant(self, access: NurseryAccess) -> None:
        user = next(u for u in self._users() if u.id == access.user_id)
        nursery = self.nurseries[access.nursery_id]
        # Équivalent des deux clés étrangères composites de nursery_access.
        if not (user.enterprise_id == nursery.enterprise_id == access.enterprise_id):
            raise AssertionError("accès entre deux entreprises : refusé par la base")
        self.accesses[(access.user_id, access.nursery_id)] = access

    async def revoke(self, user_id: uuid.UUID, nursery_id: uuid.UUID) -> bool:
        return self.accesses.pop((user_id, nursery_id), None) is not None

    async def commit(self) -> None:
        self.commits += 1
