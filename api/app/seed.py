"""Jeu de données synthétique de démonstration. Aucune donnée réelle.

Idempotent : chaque entreprise, crèche, famille, pièce, compte et accès n'est
créé que s'il manque. Lancement : python -m app.seed

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
from app.cleaning.models import CleaningTask, Frequency, Room, RoomTask
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


# Comptes famille fictifs, reliés à leur fiche de responsable (consultation famille, LUN-011).
DEMO_GUARDIAN_ACCOUNTS = ("alice.garnier@famille.test", "claire.temoin@famille.test")


# Catalogue de ménage par entreprise : (tâche, consigne).
DEMO_CLEANING_TASKS = {
    "Groupe Démo": (("Désinfecter le plan de change", "Spray désinfectant, laisser agir, essuyer"),
                    ("Laver les sols", None), ("Désinfecter les jouets", None), ("Changer les draps", None),
                    ("Nettoyer les vitres", None)),
    "Groupe Témoin": (("Laver les sols", None),),
}
_DAILY, _WEEKLY, _MONTHLY = Frequency.DAILY, Frequency.WEEKLY, Frequency.MONTHLY
# Pièces fictives : (crèche, pièce, ordre de passage, tâches (nom, fréquence, jours ISO)).
DEMO_ROOMS = (
    ("Crèche Démo Nord", "Espace de change", 0,
     (("Désinfecter le plan de change", _DAILY, None), ("Laver les sols", _DAILY, None))),
    ("Crèche Démo Nord", "Salle d'activité", 1,
     (("Laver les sols", _DAILY, None), ("Désinfecter les jouets", _WEEKLY, [1, 3, 5]),
      ("Nettoyer les vitres", _MONTHLY, [1]))),
    ("Crèche Démo Nord", "Dortoir", 2, (("Changer les draps", _WEEKLY, [5]), ("Laver les sols", _WEEKLY, [2, 4]))),
    ("Micro-crèche Démo Sud", "Salle d'activité", 0,
     (("Laver les sols", _DAILY, None), ("Désinfecter les jouets", _WEEKLY, [3]))),
    ("Crèche Témoin", "Salle", 0, (("Laver les sols", _DAILY, None),)),
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


def seed_cleaning(session: Session) -> int:
    """Crée le catalogue et les pièces fictives manquants, avec leurs tâches. Renvoie le nombre de pièces créées."""
    for enterprise_name, tasks in DEMO_CLEANING_TASKS.items():
        enterprise_id = session.scalar(select(Enterprise.id).where(Enterprise.name == enterprise_name))
        for name, instructions in tasks:
            if not session.scalar(select(CleaningTask.id).where(CleaningTask.enterprise_id == enterprise_id,
                                                                CleaningTask.name == name)):
                session.add(CleaningTask(enterprise_id=enterprise_id, name=name, instructions=instructions))
    session.flush()
    created = 0
    for nursery_name, room_name, order, tasks in DEMO_ROOMS:
        nursery = session.scalar(select(Nursery).where(Nursery.name == nursery_name))
        if session.scalar(select(Room.id).where(Room.nursery_id == nursery.id, Room.name == room_name)):
            continue
        room = Room(nursery_id=nursery.id, name=room_name, display_order=order)
        session.add(room)
        session.flush()
        for position, (task_name, frequency, weekdays) in enumerate(tasks):
            task_id = session.scalar(select(CleaningTask.id).where(CleaningTask.enterprise_id == nursery.enterprise_id,
                                                                   CleaningTask.name == task_name))
            session.add(RoomTask(room_id=room.id, task_id=task_id, nursery_id=nursery.id,
                                 enterprise_id=nursery.enterprise_id, frequency=frequency, weekdays=weekdays,
                                 display_order=position))
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
    for email in DEMO_GUARDIAN_ACCOUNTS:
        guardian = session.scalar(select(Guardian).where(Guardian.email == email))
        if guardian is None or session.scalar(select(AppUser.id).where(AppUser.email == email)):
            continue
        check_policy(password, email)
        user = AppUser(email=email, password_hash=hash_password_sync(password), first_name=guardian.first_name,
                       last_name=guardian.last_name, role=UserRole.GUARDIAN)
        session.add(user)
        session.flush()
        guardian.user_id = user.id
        created += 1
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
        rooms = seed_cleaning(session)
        session.commit()
        print(f"[api] pièces de ménage fictives : {rooms} créée(s)" if rooms else
              "[api] pièces de ménage fictives déjà présentes")
        demo_password = os.environ.get("SEED_DEMO_PASSWORD")
        if demo_password:
            try:
                print(f"[api] comptes de démonstration : {seed_users(session, demo_password)} créé(s)")
            except PasswordPolicyError as error:
                print(f"[api] comptes de démonstration non créés, SEED_DEMO_PASSWORD refusé : {error}")
        else:
            print("[api] comptes de démonstration : SEED_DEMO_PASSWORD absent, aucun compte créé")
