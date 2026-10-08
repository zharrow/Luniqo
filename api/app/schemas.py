"""Schémas Pydantic exposés par l'API (et donc par la documentation OpenAPI)."""

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict


class Health(BaseModel):
    status: Literal["ok", "degraded"]
    database: Literal["ok", "unreachable"]
    version: str


class NurseryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    enterprise_id: uuid.UUID
    name: str
    city: str
    capacity: int
