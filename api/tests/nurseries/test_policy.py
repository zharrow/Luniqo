"""Succès de mise en route (LUN-128) : règles et dates, sans base ni horloge."""

from datetime import UTC, datetime, timedelta

from app.nurseries.policy import Milestone, OnboardingFacts, StaffAccess, Tablet, achievements, tablet_active

NOW = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)
NOV_3 = datetime(2026, 11, 3, 9, 0, tzinfo=UTC)
NOV_10 = datetime(2026, 11, 10, 9, 0, tzinfo=UTC)


def _tablet(created_at=NOV_3, *, expires_at=NOW + timedelta(days=30), revoked_at=None):
    return Tablet(created_at=created_at, expires_at=expires_at, revoked_at=revoked_at)


def _dates(facts: OnboardingFacts) -> dict[Milestone, datetime | None]:
    return {a.milestone: a.achieved_at for a in achievements(facts, NOW)}


def test_creche_neuve_aucun_succes_dans_l_ordre_des_etapes():
    result = achievements(OnboardingFacts(accesses=[], tablets=[], first_arrival=None), NOW)
    assert [a.milestone for a in result] == [Milestone.STAFF, Milestone.TABLET, Milestone.FIRST_ATTENDANCE]
    assert not any(a.achieved for a in result)


def test_deux_succes_sur_trois_chacun_date():
    facts = OnboardingFacts(accesses=[StaffAccess(NOV_3, True)], tablets=[_tablet(NOV_10)], first_arrival=None)
    assert _dates(facts) == {Milestone.STAFF: NOV_3, Milestone.TABLET: NOV_10, Milestone.FIRST_ATTENDANCE: None}


def test_trois_succes():
    facts = OnboardingFacts(accesses=[StaffAccess(NOV_3, True)], tablets=[_tablet()], first_arrival=NOV_10)
    assert all(a.achieved for a in achievements(facts, NOW))
    assert _dates(facts)[Milestone.FIRST_ATTENDANCE] == NOV_10


def test_personnel_date_du_plus_ancien_acces():
    facts = OnboardingFacts(accesses=[StaffAccess(NOV_10, True), StaffAccess(NOV_3, True)], tablets=[],
                            first_arrival=None)
    assert _dates(facts)[Milestone.STAFF] == NOV_3


def test_personnel_ignore_les_employes_partis():
    # L'accès le plus ancien appartient à une employée partie : la date suit le seul accès encore valable.
    facts = OnboardingFacts(accesses=[StaffAccess(NOV_3, False), StaffAccess(NOV_10, True)], tablets=[],
                            first_arrival=None)
    assert _dates(facts)[Milestone.STAFF] == NOV_10


def test_personnel_perdu_quand_la_seule_employee_part():
    facts = OnboardingFacts(accesses=[StaffAccess(NOV_3, False)], tablets=[], first_arrival=None)
    assert _dates(facts)[Milestone.STAFF] is None


def test_tablette_perdue_quand_la_seule_est_revoquee():
    facts = OnboardingFacts(accesses=[], tablets=[_tablet(revoked_at=NOV_10)], first_arrival=None)
    assert _dates(facts)[Milestone.TABLET] is None


def test_tablette_perdue_quand_la_seule_a_expire():
    facts = OnboardingFacts(accesses=[], tablets=[_tablet(expires_at=NOW)], first_arrival=None)
    assert _dates(facts)[Milestone.TABLET] is None


def test_tablette_datee_de_la_plus_ancienne_encore_active():
    facts = OnboardingFacts(accesses=[], tablets=[
        _tablet(datetime(2026, 11, 1, tzinfo=UTC), revoked_at=NOV_3),
        _tablet(NOV_10),
        _tablet(NOV_3),
    ], first_arrival=None)
    assert _dates(facts)[Milestone.TABLET] == NOV_3


def test_tablette_active_jusqu_a_l_instant_d_expiration_exclu():
    assert tablet_active(_tablet(expires_at=NOW + timedelta(seconds=1)), NOW)
    assert not tablet_active(_tablet(expires_at=NOW), NOW)
    assert not tablet_active(_tablet(revoked_at=NOV_10), NOW)
