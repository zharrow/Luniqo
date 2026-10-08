"""Règle d'accès, testée seule (app/nurseries/access.py)."""

import uuid

import pytest

from app.auth.models import AppUser, UserRole
from app.nurseries.access import Access, nursery_access
from app.nurseries.models import Nursery

A, B = uuid.uuid4(), uuid.uuid4()


def user(role, enterprise=A, active=True):
    return AppUser(id=uuid.uuid4(), role=role, enterprise_id=enterprise, is_active=active)


def nursery(enterprise=A, active=True):
    return Nursery(id=uuid.uuid4(), enterprise_id=enterprise, is_active=active)


@pytest.mark.parametrize(("who", "where", "granted", "expected"), [
    (user(UserRole.OWNER), nursery(), False, Access.MANAGE),
    (user(UserRole.OWNER), nursery(active=False), False, Access.MANAGE),
    (user(UserRole.OWNER), nursery(B), False, Access.NONE),
    (user(UserRole.OWNER, active=False), nursery(), False, Access.NONE),
    (user(UserRole.EMPLOYEE), nursery(), True, Access.READ),
    (user(UserRole.EMPLOYEE), nursery(), False, Access.NONE),
    (user(UserRole.EMPLOYEE), nursery(active=False), True, Access.NONE),
    # Accès accordé mais crèche d'une autre entreprise : impossible en base, refusé quand même.
    (user(UserRole.EMPLOYEE), nursery(B), True, Access.NONE),
    (user(UserRole.EMPLOYEE, active=False), nursery(), True, Access.NONE),
    (user(UserRole.DEVELOPER, enterprise=None), nursery(), True, Access.NONE),
    (user(UserRole.GUARDIAN, enterprise=None), nursery(), True, Access.NONE),
], ids=[
    "direction-sa-creche", "direction-sa-creche-fermee", "direction-autre-entreprise", "direction-desactivee",
    "employe-avec-acces", "employe-sans-acces", "employe-creche-fermee", "employe-autre-entreprise",
    "employe-desactive", "editeur", "famille",
])
def test_regle_d_acces(who, where, granted, expected):
    assert nursery_access(who, where, granted=granted) == expected
