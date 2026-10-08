"""Jeu de données synthétique de démonstration. Aucune donnée réelle.

Idempotent : ne recrée ni l'entreprise ni les comptes déjà présents.
Lancement : python -m app.seed

Les comptes de démonstration ne sont créés que si SEED_DEMO_PASSWORD est
défini : aucun mot de passe n'est écrit dans le dépôt, qui est public.
"""

import os

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.auth.models import AppUser, UserRole
from app.auth.passwords import PasswordPolicyError, check_policy, hash_password_sync
from app.config import get_settings
from app.models import Enterprise, Nursery

# Domaine réservé .test (RFC 2606) : ces adresses ne peuvent appartenir à personne.
DEMO_USERS = (
    ("direction@demo.test", "Camille", "Martin", UserRole.OWNER),
    ("employe@demo.test", "Lucas", "Bernard", UserRole.EMPLOYEE),
)


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


def seed_users(session: Session, password: str) -> int:
    """Crée les comptes de démonstration manquants. Renvoie le nombre de comptes créés."""
    created = 0
    for email, first_name, last_name, role in DEMO_USERS:
        if session.scalar(select(AppUser.id).where(AppUser.email == email)):
            continue
        check_policy(password, email)
        session.add(AppUser(email=email, password_hash=hash_password_sync(password),
                            first_name=first_name, last_name=last_name, role=role))
        created += 1
    session.commit()
    return created


if __name__ == "__main__":
    # Script lancé une fois avant le serveur : connexion synchrone suffisante.
    with Session(create_engine(get_settings().database_url)) as session:
        created = seed(session)
        print(f"[api] données de démonstration : {created} crèche(s) créée(s)" if created else "[api] données de démonstration déjà présentes")
        demo_password = os.environ.get("SEED_DEMO_PASSWORD")
        if demo_password:
            try:
                print(f"[api] comptes de démonstration : {seed_users(session, demo_password)} créé(s)")
            except PasswordPolicyError as error:
                print(f"[api] comptes de démonstration non créés, SEED_DEMO_PASSWORD refusé : {error}")
        else:
            print("[api] comptes de démonstration : SEED_DEMO_PASSWORD absent, aucun compte créé")
