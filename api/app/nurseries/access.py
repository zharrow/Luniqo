"""Règle d'accès d'un utilisateur à une crèche.

Fonction pure : toute route de crèche passe par elle (via les dépendances de
app/nurseries/dependencies.py), et elle se teste seule, cas par cas.

| Rôle      | Crèches de son entreprise                     | Autres crèches |
|-----------|-----------------------------------------------|----------------|
| owner     | gestion (actives ou non)                      | aucun accès    |
| employee  | lecture, si un accès lui est accordé et       | aucun accès    |
|           | que la crèche est active                      |                |
| developer | aucun accès aux données des crèches           | aucun accès    |
| guardian  | aucun accès (consultation famille : LUN-011)  | aucun accès    |

L'éditeur (developer) n'a pas accès aux données des crèches, qui comprendront
des données de santé d'enfants : moindre privilège. Ses besoins (métriques,
entreprises) passeront par des routes d'administration dédiées.
"""

import enum

from app.auth.models import AppUser, UserRole
from app.nurseries.models import Nursery


class Access(enum.IntEnum):
    NONE = 0
    READ = 1
    MANAGE = 2


def nursery_access(user: AppUser, nursery: Nursery, *, granted: bool) -> Access:
    """`granted` : une ligne nursery_access relie cet utilisateur à cette crèche."""
    if not user.is_active or user.enterprise_id is None or user.enterprise_id != nursery.enterprise_id:
        return Access.NONE
    if user.role == UserRole.OWNER:
        return Access.MANAGE
    if user.role == UserRole.EMPLOYEE and granted and nursery.is_active:
        return Access.READ
    return Access.NONE
