"""Routes des familles, enfants et responsables : /api/v2/nurseries/{nursery_id}/…

Toutes passent par `ReadableNursery` (lecture : direction, employés ayant accès
à la crèche) ou `ManagedNursery` (écriture : direction). Chaque objet est
cherché **dans la crèche de la route** : un identifiant d'une autre crèche
répond 404, comme un identifiant inexistant.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.children.models import Child, ChildGuardian, ChildStatus, Family, Guardian
from app.children.schemas import (
    ChildCreate,
    ChildDetail,
    ChildGuardianOut,
    ChildOut,
    ChildUpdate,
    FamilyCreate,
    FamilyDetail,
    FamilyOut,
    FamilyUpdate,
    GuardianCreate,
    GuardianOut,
    GuardianUpdate,
    LinkIn,
)
from app.db import SessionDep
from app.nurseries.dependencies import ManagedNursery, ReadableNursery
from app.openapi import error_responses

router = APIRouter(prefix="/api/v2/nurseries/{nursery_id}", tags=["enfants et familles"])

_FAMILY = (status.HTTP_404_NOT_FOUND, "Famille introuvable")
_CHILD = (status.HTTP_404_NOT_FOUND, "Enfant introuvable")
_GUARDIAN = (status.HTTP_404_NOT_FOUND, "Responsable introuvable")
_EMPTY_FIELD = (status.HTTP_422_UNPROCESSABLE_CONTENT, "Le champ first_name ne peut pas être vide")
_OTHER_FAMILY = (status.HTTP_422_UNPROCESSABLE_CONTENT, "Le responsable n'appartient pas à la famille")
_INCOHERENT_DATES = (status.HTTP_422_UNPROCESSABLE_CONTENT, "Un enfant parti a une date de sortie, et seulement lui")


def guardian_out(guardian: Guardian) -> GuardianOut:
    return GuardianOut(id=guardian.id, family_id=guardian.family_id, first_name=guardian.first_name,
                       last_name=guardian.last_name, email=guardian.email, phone=guardian.phone,
                       has_account=guardian.user_id is not None, is_active=guardian.is_active)


async def _get(db: AsyncSession, model, nursery_id: uuid.UUID, object_id: uuid.UUID, label: str):
    found = await db.scalar(select(model).where(model.id == object_id, model.nursery_id == nursery_id))
    if found is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} introuvable")
    return found


def _apply(target, changes: dict, required: tuple[str, ...]) -> None:
    for field in required:
        if field in changes and changes[field] is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Le champ {field} ne peut pas être vide")
    for field, value in changes.items():
        setattr(target, field, value)


# --- Familles ------------------------------------------------------------------

@router.get("/families")
async def list_families(context: ReadableNursery, db: SessionDep) -> list[FamilyOut]:
    """Familles de la crèche, désactivées comprises, par ordre alphabétique."""
    families = await db.scalars(select(Family).where(Family.nursery_id == context.nursery.id).order_by(Family.label))
    return [FamilyOut.model_validate(family) for family in families]


@router.post("/families", status_code=status.HTTP_201_CREATED)
async def create_family(body: FamilyCreate, context: ManagedNursery, db: SessionDep) -> FamilyOut:
    """Crée une famille ; ses enfants et ses responsables s'ajoutent ensuite."""
    family = Family(id=uuid.uuid4(), nursery_id=context.nursery.id, is_active=True, **body.model_dump())
    db.add(family)
    await db.commit()
    return FamilyOut.model_validate(family)


@router.get("/families/{family_id}", responses=error_responses(_FAMILY))
async def get_family(family_id: uuid.UUID, context: ReadableNursery, db: SessionDep) -> FamilyDetail:
    """La famille, ses enfants et ses responsables."""
    family = await _get(db, Family, context.nursery.id, family_id, "Famille")
    children = await db.scalars(select(Child).where(Child.family_id == family.id).order_by(Child.first_name))
    guardians = await db.scalars(select(Guardian).where(Guardian.family_id == family.id).order_by(Guardian.last_name))
    return FamilyDetail(**FamilyOut.model_validate(family).model_dump(),
                        children=[ChildOut.model_validate(child) for child in children],
                        guardians=[guardian_out(guardian) for guardian in guardians])


@router.patch("/families/{family_id}", responses=error_responses(_FAMILY, _EMPTY_FIELD))
async def update_family(family_id: uuid.UUID, body: FamilyUpdate, context: ManagedNursery,
                        db: SessionDep) -> FamilyOut:
    """Modifie la famille ; seuls les champs envoyés changent."""
    family = await _get(db, Family, context.nursery.id, family_id, "Famille")
    _apply(family, body.model_dump(exclude_unset=True), ("label", "is_active"))
    await db.commit()
    return FamilyOut.model_validate(family)


# --- Enfants ---------------------------------------------------------------------

@router.get("/children")
async def list_children(context: ReadableNursery, db: SessionDep,
                        status_filter: Annotated[ChildStatus | None, Query(alias="status")] = None) -> list[ChildOut]:
    """Enfants de la crèche. Par défaut, tous sauf les enfants partis ; `?status=` pour filtrer."""
    statement = select(Child).where(Child.nursery_id == context.nursery.id)
    if status_filter is None:
        statement = statement.where(Child.status != ChildStatus.DEPARTED)
    else:
        statement = statement.where(Child.status == status_filter)
    children = await db.scalars(statement.order_by(Child.last_name, Child.first_name))
    return [ChildOut.model_validate(child) for child in children]


@router.post("/families/{family_id}/children", status_code=status.HTTP_201_CREATED, responses=error_responses(_FAMILY))
async def create_child(family_id: uuid.UUID, body: ChildCreate, context: ManagedNursery, db: SessionDep) -> ChildOut:
    """Inscrit un enfant dans la famille (statut `adaptation` par défaut)."""
    family = await _get(db, Family, context.nursery.id, family_id, "Famille")
    child = Child(id=uuid.uuid4(), family_id=family.id, nursery_id=family.nursery_id, exit_date=None,
                  **body.model_dump())
    db.add(child)
    await db.commit()
    return ChildOut.model_validate(child)


async def _child_detail(db: AsyncSession, child: Child) -> ChildDetail:
    rows = await db.execute(
        select(ChildGuardian, Guardian).join(Guardian, Guardian.id == ChildGuardian.guardian_id)
        .where(ChildGuardian.child_id == child.id).order_by(Guardian.last_name, Guardian.first_name))
    guardians = [ChildGuardianOut(guardian=guardian_out(guardian), relationship=link.relationship,
                                  has_parental_authority=link.has_parental_authority,
                                  is_authorized_pickup=link.is_authorized_pickup,
                                  is_emergency_contact=link.is_emergency_contact) for link, guardian in rows]
    return ChildDetail(**ChildOut.model_validate(child).model_dump(), guardians=guardians)


@router.get("/children/{child_id}", responses=error_responses(_CHILD))
async def get_child(child_id: uuid.UUID, context: ReadableNursery, db: SessionDep) -> ChildDetail:
    """Fiche de l'enfant et ses responsables, avec leurs autorisations."""
    return await _child_detail(db, await _get(db, Child, context.nursery.id, child_id, "Enfant"))


@router.patch("/children/{child_id}", responses=error_responses(_CHILD, _EMPTY_FIELD, _INCOHERENT_DATES))
async def update_child(child_id: uuid.UUID, body: ChildUpdate, context: ManagedNursery, db: SessionDep) -> ChildOut:
    """Modifie l'enfant. Le départ se déclare avec `status: departed` et `exit_date` ; un retour efface la sortie."""
    child = await _get(db, Child, context.nursery.id, child_id, "Enfant")
    changes = body.model_dump(exclude_unset=True)
    if changes.get("status") not in (None, ChildStatus.DEPARTED) and "exit_date" not in changes:
        # Retour d'un enfant parti (réinscription) : la date de sortie est effacée.
        changes["exit_date"] = None
    for field in ("first_name", "last_name", "birth_date", "enrollment_date", "status"):
        if field in changes and changes[field] is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Le champ {field} ne peut pas être vide")
    merged = {field: changes.get(field, getattr(child, field))
              for field in ("birth_date", "enrollment_date", "exit_date", "status")}
    errors = []
    if merged["enrollment_date"] < merged["birth_date"]:
        errors.append("la date d'entrée ne peut pas précéder la naissance")
    if merged["exit_date"] is not None and merged["exit_date"] < merged["enrollment_date"]:
        errors.append("la date de sortie ne peut pas précéder l'entrée")
    if (merged["status"] == ChildStatus.DEPARTED) != (merged["exit_date"] is not None):
        errors.append("un enfant parti a une date de sortie, et seulement lui")
    if errors:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, " ; ".join(errors).capitalize())
    for field, value in changes.items():
        setattr(child, field, value)
    await db.commit()
    return ChildOut.model_validate(child)


# --- Responsables ----------------------------------------------------------------

@router.post("/families/{family_id}/guardians", status_code=status.HTTP_201_CREATED, responses=error_responses(_FAMILY))
async def create_guardian(family_id: uuid.UUID, body: GuardianCreate, context: ManagedNursery,
                          db: SessionDep) -> GuardianOut:
    """Ajoute un responsable à la famille. Le relier à chaque enfant : `PUT /children/{id}/guardians/{id}`."""
    family = await _get(db, Family, context.nursery.id, family_id, "Famille")
    guardian = Guardian(id=uuid.uuid4(), family_id=family.id, nursery_id=family.nursery_id, user_id=None,
                        is_active=True, **body.model_dump())
    db.add(guardian)
    await db.commit()
    return guardian_out(guardian)


@router.patch("/guardians/{guardian_id}", responses=error_responses(_GUARDIAN, _EMPTY_FIELD))
async def update_guardian(guardian_id: uuid.UUID, body: GuardianUpdate, context: ManagedNursery,
                          db: SessionDep) -> GuardianOut:
    """Modifie le responsable ; seuls les champs envoyés changent."""
    guardian = await _get(db, Guardian, context.nursery.id, guardian_id, "Responsable")
    _apply(guardian, body.model_dump(exclude_unset=True), ("first_name", "last_name", "is_active"))
    await db.commit()
    return guardian_out(guardian)


@router.put("/children/{child_id}/guardians/{guardian_id}", status_code=status.HTTP_204_NO_CONTENT,
            responses=error_responses(_CHILD, _GUARDIAN, _OTHER_FAMILY))
async def link_guardian(child_id: uuid.UUID, guardian_id: uuid.UUID, body: LinkIn, context: ManagedNursery,
                        db: SessionDep) -> None:
    """Relie un responsable à un enfant **de la même famille**, ou met à jour ses autorisations."""
    child = await _get(db, Child, context.nursery.id, child_id, "Enfant")
    guardian = await _get(db, Guardian, context.nursery.id, guardian_id, "Responsable")
    if guardian.family_id != child.family_id:
        raise HTTPException(*_OTHER_FAMILY)
    link = await db.get(ChildGuardian, (child.id, guardian.id))
    if link is None:
        link = ChildGuardian(child_id=child.id, guardian_id=guardian.id, family_id=child.family_id)
        db.add(link)
    for field, value in body.model_dump().items():
        setattr(link, field, value)
    await db.commit()


@router.delete("/children/{child_id}/guardians/{guardian_id}", status_code=status.HTTP_204_NO_CONTENT,
               responses=error_responses(_CHILD))
async def unlink_guardian(child_id: uuid.UUID, guardian_id: uuid.UUID, context: ManagedNursery,
                          db: SessionDep) -> None:
    """Retire le lien entre le responsable et l'enfant. Sans effet s'il n'existait pas."""
    child = await _get(db, Child, context.nursery.id, child_id, "Enfant")
    link = await db.get(ChildGuardian, (child.id, guardian_id))
    if link is not None:
        await db.delete(link)
        await db.commit()
