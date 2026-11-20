"""Transmissions (LUN-146) : règles, validation de la saisie et documentation, sans base ni horloge."""

from datetime import UTC, date, datetime

import pytest
from pydantic import ValidationError

from app.main import app
from app.notes.policy import EMPTY, clean_text, note_day
from app.notes.schemas import NoteCreate
from app.openapi import documented_codes


def test_texte_debarrasse_de_ses_espaces():
    assert clean_text("  A bien mangé \n") == "A bien mangé"


@pytest.mark.parametrize("text", ["", "   ", "\n\t "])
def test_texte_vide_refuse(text):
    with pytest.raises(ValueError, match=EMPTY):
        clean_text(text)


@pytest.mark.parametrize(("moment", "day"), [
    # 0 h 30 à Paris en hiver (UTC+1) : 23 h 30 UTC la veille.
    (datetime(2026, 11, 19, 23, 30, tzinfo=UTC), date(2026, 11, 20)),
    # 0 h 30 à Paris en été (UTC+2) : 22 h 30 UTC la veille.
    (datetime(2026, 7, 15, 22, 30, tzinfo=UTC), date(2026, 7, 16)),
    (datetime(2026, 11, 20, 22, 59, tzinfo=UTC), date(2026, 11, 20)),
])
def test_jour_a_paris(moment, day):
    assert note_day(moment) == day


def test_saisie_de_500_caracteres_apres_retrait_des_espaces():
    assert NoteCreate(text=f"  {'x' * 500}  ").text == "x" * 500


@pytest.mark.parametrize(("text", "kind"), [("   ", "value_error"), ("x" * 501, "string_too_long")])
def test_saisie_refusee(text, kind):
    with pytest.raises(ValidationError) as refused:
        NoteCreate(text=text)
    assert [error["type"] for error in refused.value.errors()] == [kind]


def test_ni_jour_ni_heure_ni_auteur_dans_la_saisie():
    with pytest.raises(ValidationError):
        NoteCreate.model_validate({"text": "Bonne sieste", "day": "2026-11-20"})


def test_documentation_des_routes():
    paths = app.openapi()["paths"]
    write = paths["/api/v2/nurseries/{nursery_id}/children/{child_id}/notes"]["post"]
    read = paths["/api/v2/nurseries/{nursery_id}/notes"]["get"]
    for operation in (write, read):
        assert operation["security"] == [{"webSession": []}]
        assert documented_codes(operation["responses"]["404"]) >= {"nursery_not_found"}
        assert documented_codes(operation["responses"]["403"]) >= {"role_refused"}
        assert "422" in operation["responses"]
    assert set(write["responses"]) >= {"201", "401", "403", "404", "422", "500"}
    assert "child_not_found" in documented_codes(write["responses"]["404"])
    # Rappel des données de santé (LUN-57), dans la route et dans le champ.
    assert "Pas d'information médicale" in write["description"]
    schema = app.openapi()["components"]["schemas"]["NoteCreate"]["properties"]["text"]
    assert "Pas d'information médicale" in schema["description"]
