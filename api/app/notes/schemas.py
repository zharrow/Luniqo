import uuid
from datetime import date, datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

from app.notes import policy
from app.notes.models import ChildNote

# Longueur vérifiée après le retrait des espaces : « Champ vide » prime sur la longueur.
NoteText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=policy.MAX_LENGTH),
                     AfterValidator(policy.clean_text)]


class NoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", json_schema_extra={"examples": [
        {"text": "A bien mangé, sieste de 13 h à 15 h"}]})

    text: NoteText = Field(description=f"Transmission, {policy.MAX_LENGTH} caractères au plus, espaces retirés. "
                                       f"{policy.NO_HEALTH_DATA} : les données de santé relèvent de LUN-57.")


class NoteOut(BaseModel):
    id: uuid.UUID
    child_id: uuid.UUID
    child_name: str
    day: date = Field(description="Jour de la transmission, à Paris")
    text: str
    author: str = Field(description="Auteur au moment de l'écriture (prénom et initiale)")
    created_at: datetime = Field(description="Heure du serveur à l'écriture")

    @classmethod
    def of(cls, note: ChildNote, child_name: str) -> NoteOut:
        return cls(id=note.id, child_id=note.child_id, child_name=child_name, day=note.day, text=note.text,
                   author=note.author_name, created_at=note.created_at)
