"""Schémas Pydantic communs. Ceux d'un domaine sont dans son module (app/auth/, app/nurseries/)."""

from typing import Literal

from pydantic import BaseModel


class Health(BaseModel):
    status: Literal["ok", "degraded"]
    database: Literal["ok", "unreachable"]
    version: str

