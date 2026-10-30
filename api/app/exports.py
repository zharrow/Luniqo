"""Historiques sur une période et exports CSV : règles communes au ménage et aux présences.

- Période : les 7 derniers jours par défaut, 366 jours au plus par requête.
- CSV : séparateur « ; » et BOM UTF-8 (un tableur réglé en français l'ouvre avec
  ses accents), heures de Paris, cellules neutralisées contre l'injection de
  formule (OWASP).
"""

import csv
import io
from collections.abc import Iterable
from datetime import date, datetime, timedelta
from typing import Annotated, Any

from fastapi import Query, Response, status

from app.attendance.policy import NURSERY_TZ
from app.openapi import error_responses

HISTORY_DEFAULT_DAYS = 7
HISTORY_MAX_DAYS = 366

_START_AFTER_END = "La date de début suit la date de fin"
_TOO_LONG = f"Période limitée à {HISTORY_MAX_DAYS} jours par requête"
BAD_RANGE = [(status.HTTP_422_UNPROCESSABLE_CONTENT, _START_AFTER_END),
             (status.HTTP_422_UNPROCESSABLE_CONTENT, _TOO_LONG)]

FromQuery = Annotated[date | None, Query(alias="from", description="Premier jour (7 jours avant `to` par défaut)")]
ToQuery = Annotated[date | None, Query(alias="to", description="Dernier jour (aujourd'hui à Paris par défaut)")]


def history_range(start: date | None, end: date | None, today: date) -> tuple[date, date]:
    """Période demandée, complétée par défaut (les 7 derniers jours), ou ValueError si elle n'a pas de sens."""
    end = end or today
    start = start or end - timedelta(days=HISTORY_DEFAULT_DAYS - 1)
    if start > end:
        raise ValueError(_START_AFTER_END)
    if (end - start).days + 1 > HISTORY_MAX_DAYS:
        raise ValueError(_TOO_LONG)
    return start, end


# Une cellule qui commence par l'un de ces caractères est interprétée comme une formule par les tableurs.
_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def csv_cell(value: str | None) -> str:
    """Neutralise l'injection de formule dans un export CSV (OWASP).

    Un nom saisi par un compte, « =HYPERLINK(…) » par exemple, reste du texte dans le tableur de la direction.
    """
    if value is None:
        return ""
    return "'" + value if value.startswith(_FORMULA_PREFIXES) else value


def local_time(moment: datetime | None) -> str:
    """Heure de Paris, « 08:45 », ou vide."""
    return moment.astimezone(NURSERY_TZ).strftime("%H:%M") if moment else ""


def csv_response(header: list[str], rows: Iterable[list[str]], filename: str) -> Response:
    """Fichier CSV à télécharger, jamais gardé en cache (données nominatives)."""
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";", lineterminator="\r\n")
    writer.writerow(header)
    writer.writerows(rows)
    return Response("﻿" + buffer.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "no-store"})


def csv_responses(description: str, *errors: tuple[int, str]) -> dict[int | str, dict[str, Any]]:
    """Documentation OpenAPI d'une route qui renvoie un CSV."""
    return {200: {"content": {"text/csv": {"schema": {"type": "string"}}}, "description": description}} | (
        error_responses(*errors))
