"""Jeu de données synthétique de démonstration. Aucune donnée réelle.

Idempotent : ne fait rien si une entreprise existe déjà.
Lancement : python -m app.seed
"""

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Enterprise, Nursery


def seed(session: Session) -> int:
    """Insère un groupe de démonstration et ses deux crèches. Renvoie le nombre de crèches créées."""
    if session.scalar(select(func.count()).select_from(Enterprise)):
        return 0
    enterprise = Enterprise(name="Groupe Démo")
    enterprise.nurseries = [
        Nursery(name="Crèche Démo Nord", city="Toulouse", capacity=30),
        Nursery(name="Micro-crèche Démo Sud", city="Labège", capacity=12),
    ]
    session.add(enterprise)
    session.commit()
    return len(enterprise.nurseries)


if __name__ == "__main__":
    # Script lancé une fois avant le serveur : connexion synchrone suffisante.
    with Session(create_engine(get_settings().database_url)) as session:
        created = seed(session)
    print(f"[api] données de démonstration : {created} crèche(s) créée(s)" if created else "[api] données de démonstration déjà présentes")
