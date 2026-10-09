"""Jeu de données synthétique de démonstration. Aucune donnée réelle.

Idempotent : chaque entreprise, crèche, compte et accès n'est créé que s'il
manque. Lancement : python -m app.seed

Deux entreprises : le groupe de démonstration, et un groupe « témoin » qui
sert à vérifier l'isolation (sa direction ne doit rien voir du premier).

Les comptes ne sont créés que si SEED_DEMO_PASSWORD est défini : aucun mot
de passe n'est écrit dans le dépôt, qui est public.
"""

import os

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.auth.models import AppUser, UserRole
from app.auth.passwords import PasswordPolicyError, check_policy, hash_password_sync
from app.config import get_settings
from app.nurseries.models import Enterprise, Nursery, NurseryAccess

DEMO_ENTERPRISES = {
    "Groupe Démo": [("Crèche Démo Nord", "Toulouse", 30), ("Micro-crèche Démo Sud", "Labège", 12)],
    "Groupe Témoin": [("Crèche Témoin", "Castanet-Tolosan", 20)],
}

# Domaine réservé .test (RFC 2606) : ces adresses ne peuvent appartenir à personne.
# (adresse, prénom, nom, rôle, entreprise, crèches accessibles)
DEMO_USERS = (
    ("direction@demo.test", "Camille", "Martin", UserRole.OWNER, "Groupe Démo", ()),
    ("employe@demo.test", "Lucas", "Bernard", UserRole.EMPLOYEE, "Groupe Démo", ("Crèche Démo Nord",)),
    ("employe.sud@demo.test", "Inès", "Moreau", UserRole.EMPLOYEE, "Groupe Démo", ("Micro-crèche Démo Sud",)),
    ("direction@temoin.test", "Paul", "Lefort", UserRole.OWNER, "Groupe Témoin", ()),
)


def seed(session: Session) -> int:
    """Crée les entreprises et crèches manquantes. Renvoie le nombre de crèches créées."""
    created = 0
    for enterprise_name, nurseries in DEMO_ENTERPRISES.items():
        enterprise = session.scalar(select(Enterprise).where(Enterprise.name == enterprise_name))
        if enterprise is None:
            enterprise = Enterprise(name=enterprise_name)
            session.add(enterprise)
            session.flush()
        for name, city, capacity in nurseries:
            exists = session.scalar(
                select(Nursery.id).where(Nursery.enterprise_id == enterprise.id, Nursery.name == name))
            if not exists:
                session.add(Nursery(enterprise_id=enterprise.id, name=name, city=city, capacity=capacity))
                created += 1
    session.commit()
    return created


def seed_users(session: Session, password: str) -> int:
    """Crée les comptes et accès manquants. Renvoie le nombre de comptes créés."""
    created = 0
    for email, first_name, last_name, role, enterprise_name, nursery_names in DEMO_USERS:
        enterprise = session.scalar(select(Enterprise).where(Enterprise.name == enterprise_name))
        user = session.scalar(select(AppUser).where(AppUser.email == email))
        if user is None:
            check_policy(password, email)
            user = AppUser(email=email, password_hash=hash_password_sync(password), first_name=first_name,
                           last_name=last_name, role=role, enterprise_id=enterprise.id)
            session.add(user)
            session.flush()
            created += 1
        for nursery_name in nursery_names:
            nursery_id = session.scalar(select(Nursery.id).where(Nursery.enterprise_id == enterprise.id,
                                                                 Nursery.name == nursery_name))
            if session.get(NurseryAccess, (user.id, nursery_id)) is None:
                session.add(NurseryAccess(user_id=user.id, nursery_id=nursery_id, enterprise_id=enterprise.id))
    session.commit()
    return created


if __name__ == "__main__":
    # Script lancé une fois avant le serveur : connexion synchrone suffisante.
    with Session(create_engine(get_settings().database_url)) as session:
        created = seed(session)
        if created:
            print(f"[api] données de démonstration : {created} crèche(s) créée(s)")
        else:
            print("[api] données de démonstration déjà présentes")
        demo_password = os.environ.get("SEED_DEMO_PASSWORD")
        if demo_password:
            try:
                print(f"[api] comptes de démonstration : {seed_users(session, demo_password)} créé(s)")
            except PasswordPolicyError as error:
                print(f"[api] comptes de démonstration non créés, SEED_DEMO_PASSWORD refusé : {error}")
        else:
            print("[api] comptes de démonstration : SEED_DEMO_PASSWORD absent, aucun compte créé")
