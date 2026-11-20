"""Réponse de la liste « À traiter » (LUN-153). Aucune phrase : le front les écrit."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.todo.policy import ToDo, ToDoKind


class ToDoItem(BaseModel):
    kind: ToDoKind = Field(description=(
        "pin_locked : PIN d'un employé bloqué ; tablet_expired : tablette expirée depuis 30 jours au plus ; "
        "departure_missing : présence d'un jour passé sans départ (31 jours au plus) ; tablet_expiring : tablette "
        "qui expire dans 7 jours au plus ; onboarding_incomplete : mise en route de la crèche incomplète"))
    nursery_id: uuid.UUID
    nursery_name: str
    subject_id: uuid.UUID = Field(description=(
        "Employé (pin_locked), tablette (tablet_*), enfant (departure_missing) ou crèche (onboarding_incomplete)"))
    subject_name: str = Field(description="Nom complet de l'employé ou de l'enfant, nom de la tablette ou de la crèche")
    since: datetime = Field(description=(
        "UTC. Blocage du PIN, expiration de la tablette (à venir pour tablet_expiring), arrivée de l'enfant, "
        "ou création de la crèche"))
    day: date | None = Field(description="Jour de la présence à Paris (departure_missing) ; null sinon")

    @classmethod
    def of(cls, item: ToDo) -> ToDoItem:
        return cls(kind=item.kind, nursery_id=item.nursery.id, nursery_name=item.nursery.name,
                   subject_id=item.subject_id, subject_name=item.subject_name, since=item.since, day=item.day)


class ToDoList(BaseModel):
    """Éléments à traiter, du plus urgent au moins urgent, puis du plus ancien au plus récent."""

    model_config = ConfigDict(json_schema_extra={"examples": [{"total": 3, "items": [
        {"kind": "pin_locked", "nursery_id": "0b6f1c1e-6d1c-4f3a-9a52-2f1d7c9e0a11", "nursery_name": "Les Lucioles",
         "subject_id": "5d2e8a40-1b7c-4e0f-8c3d-6a9b2e1f4c77", "subject_name": "Camille Exemple",
         "since": "2026-11-19T07:42:00Z", "day": None},
        {"kind": "departure_missing", "nursery_id": "0b6f1c1e-6d1c-4f3a-9a52-2f1d7c9e0a11",
         "nursery_name": "Les Lucioles", "subject_id": "9c4a2b10-3e5d-4f6a-8b7c-1d2e3f4a5b66",
         "subject_name": "Léo Fictif", "since": "2026-11-18T07:15:00Z", "day": "2026-11-18"},
        {"kind": "tablet_expiring", "nursery_id": "0b6f1c1e-6d1c-4f3a-9a52-2f1d7c9e0a11",
         "nursery_name": "Les Lucioles", "subject_id": "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a55",
         "subject_name": "Tablette de l'entrée", "since": "2026-11-24T09:00:00Z", "day": None},
    ]}]})

    items: list[ToDoItem]
    total: int = Field(ge=0, description="Nombre d'éléments (tous renvoyés : la liste n'est pas paginée)")
