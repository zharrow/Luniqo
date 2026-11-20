"""Règles des transmissions de la journée (LUN-146), sans base ni horloge : testées seules."""

from datetime import date, datetime

from app.attendance.policy import local_day

MAX_LENGTH = 500
EMPTY = "La transmission ne peut pas être vide"
# Rappel affiché sous le champ et dans la documentation : les données de santé attendent LUN-57.
NO_HEALTH_DATA = "Pas d'information médicale (allergies, traitements)"


def clean_text(text: str) -> str:
    """Texte d'une transmission, espaces de début et de fin retirés ; refusé s'il ne reste rien."""
    cleaned = text.strip()
    if not cleaned:
        raise ValueError(EMPTY)
    return cleaned


def note_day(written_at: datetime) -> date:
    """Jour de la transmission à Paris : une transmission écrite à 0 h 30 compte pour ce jour-là."""
    return local_day(written_at)
