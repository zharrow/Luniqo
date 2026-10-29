"""Durées de conservation de la purge (LUN-54). Fonctions pures, testées seules.

Une donnée n'est gardée que tant qu'elle sert (RGPD, art. 5.1.e) :

- session : jusqu'à son expiration, après laquelle l'API la refuse déjà ;
- journal auth_event : 6 mois (CNIL, journalisation : 6 mois à 1 an ;
  décision de Florent du 2026-10-08) ;
- invitation (employé, famille) : jusqu'à son expiration. Sa création et son
  acceptation restent dans le journal ;
- défi de passkey (LUN-69) : jusqu'à son expiration (5 minutes).

Chaque date limite reprend la règle d'expiration du module concerné : la purge
ne supprime jamais ce que l'API accepterait encore.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.auth import policy as auth_policy
from app.tablets import policy as tablet_policy

# 6 mois pleins : 184 jours, la plus longue période de 6 mois du calendrier
# (juillet à décembre). Un événement n'est jamais effacé avant ses 6 mois, et au
# plus 3 jours après : on reste dans la fourchette de la CNIL. Bien au-delà
# des fenêtres de 15 minutes de la limitation des tentatives, qui lisent le journal.
AUTH_EVENT_RETENTION = timedelta(days=184)


@dataclass(frozen=True)
class Cutoffs:
    """Est supprimé ce qui est antérieur ou égal à ces dates."""

    web_session_seen: datetime
    web_session_created: datetime
    tablet_session_created: datetime
    auth_event: datetime
    invitation_expires: datetime
    challenge_expires: datetime


def cutoffs(now: datetime) -> Cutoffs:
    return Cutoffs(
        # Session web inactive depuis 30 minutes, ou ouverte depuis 12 heures.
        web_session_seen=now - auth_policy.IDLE_TIMEOUT,
        web_session_created=now - auth_policy.ABSOLUTE_TIMEOUT,
        # Session d'action de la tablette : 2 minutes.
        tablet_session_created=now - tablet_policy.ACTION_SESSION_LIFETIME,
        auth_event=now - AUTH_EVENT_RETENTION,
        invitation_expires=now,
        challenge_expires=now,
    )
