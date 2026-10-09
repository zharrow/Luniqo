"""Jeu de données synthétique de démonstration. Aucune donnée réelle.

Idempotent : chaque entreprise, crèche, compte et accès n'est créé que s'il
manque. Lancement : python -m app.seed

Deux entreprises : le groupe de démonstration, et un groupe « témoin » qui
sert à vérifier l'isolation (sa direction ne doit rien voir du premier).

Les comptes ne sont créés que si SEED_DEMO_PASSWORD est défini : aucun mot
de passe n'est écrit dans le dépôt, qui est public.
"""

import os
from datetime import date

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.auth.models import AppUser, UserRole
from app.auth.passwords import PasswordPolicyError, check_policy, hash_password_sync
from app.children.models import Child, ChildGuardian, ChildStatus, Family, Guardian, Relationship
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


# Familles fictives : (crèche, foyer, enfants (prénom, nom, naissance, statut),
# responsables (prénom, nom, adresse, lien, autorité parentale, peut venir chercher)).
DEMO_FAMILIES = (
    ("Crèche Démo Nord", "Famille Garnier",
     (("Léo", "Garnier", date(2024, 3, 12), ChildStatus.ACTIVE),),
     (("Alice", "Garnier", "alice.garnier@famille.test", Relationship.PARENT, True, True),
      ("Karim", "Garnier", "karim.garnier@famille.test", Relationship.PARENT, True, True))),
    ("Crèche Démo Nord", "Famille Lambert",
     (("Emma", "Lambert", date(2023, 11, 2), ChildStatus.ACTIVE),
      ("Jules", "Lambert", date(2025, 6, 20), ChildStatus.ADAPTATION)),
     (("Sophie", "Lambert", "sophie.lambert@famille.test", Relationship.PARENT, True, True),
      ("Jeanne", "Lambert", None, Relationship.OTHER, False, True))),
    ("Micro-crèche Démo Sud", "Famille Roux",
     (("Nina", "Roux", date(2024, 9, 5), ChildStatus.ACTIVE),),
     (("Thomas", "Roux", "thomas.roux@famille.test", Relationship.PARENT, True, True),)),
    ("Crèche Témoin", "Famille Témoin",
     (("Tom", "Témoin", date(2024, 1, 15), ChildStatus.ACTIVE),),
     (("Claire", "Témoin", "claire.temoin@famille.test", Relationship.PARENT, True, True),)),
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


def seed_families(session: Session) -> int:
    """Crée les familles fictives manquantes, avec enfants, responsables et liens. Renvoie le nombre de familles."""
    created = 0
    for nursery_name, label, children, guardians in DEMO_FAMILIES:
        nursery_id = session.scalar(select(Nursery.id).where(Nursery.name == nursery_name))
        if session.scalar(select(Family.id).where(Family.nursery_id == nursery_id, Family.label == label)):
            continue
        family = Family(nursery_id=nursery_id, label=label, city="Toulouse")
        session.add(family)
        session.flush()
        kids = [Child(family_id=family.id, nursery_id=nursery_id, first_name=first, last_name=last, birth_date=born,
                      status=status, enrollment_date=date(2025, 9, 1) if born < date(2025, 9, 1) else born)
                for first, last, born, status in children]
        adults = [Guardian(family_id=family.id, nursery_id=nursery_id, first_name=first, last_name=last, email=email)
                  for first, last, email, *_ in guardians]
        session.add_all(kids + adults)
        session.flush()
        for kid in kids:
            for adult, (*_, relation, authority, pickup) in zip(adults, guardians, strict=True):
                session.add(ChildGuardian(child_id=kid.id, guardian_id=adult.id, family_id=family.id,
                                          relationship=relation, has_parental_authority=authority,
                                          is_authorized_pickup=pickup, is_emergency_contact=authority))
        created += 1
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
        families = seed_families(session)
        session.commit()
        if families:
            print(f"[api] familles fictives : {families} créée(s)")
        else:
            print("[api] familles fictives déjà présentes")
        demo_password = os.environ.get("SEED_DEMO_PASSWORD")
        if demo_password:
            try:
                print(f"[api] comptes de démonstration : {seed_users(session, demo_password)} créé(s)")
            except PasswordPolicyError as error:
                print(f"[api] comptes de démonstration non créés, SEED_DEMO_PASSWORD refusé : {error}")
        else:
            print("[api] comptes de démonstration : SEED_DEMO_PASSWORD absent, aucun compte créé")
