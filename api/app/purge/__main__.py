"""Lancement de la purge : python -m app.purge

À exécuter une fois par jour (planificateur de l'hôte) ; le conteneur de l'API
la lance aussi à chaque démarrage. Une ligne de compte rendu, sans donnée
personnelle, dans les journaux du conteneur.
"""

import asyncio
from datetime import UTC, datetime

from app.db import get_engine, new_session
from app.purge.service import purge


async def main() -> None:
    try:
        async with new_session() as db:
            report = await purge(db, datetime.now(UTC))
    finally:
        await get_engine().dispose()
    print(f"[api] purge : {report.sessions} session(s) expirée(s), {report.auth_events} événement(s) du journal "
          f"de plus de 6 mois, {report.staff_invitations + report.family_invitations} invitation(s) expirée(s) "
          "supprimés", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
