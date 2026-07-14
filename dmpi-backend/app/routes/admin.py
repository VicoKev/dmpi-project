from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database_sql import get_sql_db
from app.models_sql import User, AuditLog
from app.schemas.user import UserCreate, UserOut
from app.schemas.logs import AuditLogOut
from app.security import hash_password, require_role
from app.audit import enregistrer_log

router = APIRouter(
    prefix="/admin",
    tags=["Administration (Super Admin)"]
)

ROLES_VALIDES = {"medecin", "infirmier", "admin_etablissement", "super_admin", "patient"}


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def creer_utilisateur(
    nouvel_utilisateur: UserCreate,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """
    Création d'un compte utilisateur (médecin, infirmier, admin établissement, patient).
    Réservé au Super Administrateur national.
    Comptes configurés à l'avance — pas d'inscription en ligne (conforme au MVP).
    """
    if nouvel_utilisateur.role not in ROLES_VALIDES:
        raise HTTPException(
            status_code=400,
            detail=f"Rôle invalide. Rôles autorisés : {', '.join(ROLES_VALIDES)}"
        )

    if nouvel_utilisateur.role in ["medecin", "infirmier", "admin_etablissement"] and not nouvel_utilisateur.etablissement_id:
        raise HTTPException(
            status_code=400,
            detail=f"L'identifiant de l'établissement de rattachement est requis pour le rôle {nouvel_utilisateur.role}."
        )

    result = await db.execute(select(User).where(User.email == nouvel_utilisateur.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Un compte avec cet email existe déjà."
        )

    nouveau_compte = User(
        email=nouvel_utilisateur.email,
        mot_de_passe_hash=hash_password(nouvel_utilisateur.mot_de_passe),
        nom=nouvel_utilisateur.nom,
        prenom=nouvel_utilisateur.prenom,
        role=nouvel_utilisateur.role,
        specialite=nouvel_utilisateur.specialite,
        service=nouvel_utilisateur.service,
        npi_patient=nouvel_utilisateur.npi_patient,
        etablissement_id=nouvel_utilisateur.etablissement_id,
        est_actif=True
    )

    db.add(nouveau_compte)
    await db.commit()
    await db.refresh(nouveau_compte)

    # Si c'est un patient, on initialise son dossier médical vide dans MongoDB
    if nouvel_utilisateur.role == "patient" and nouvel_utilisateur.npi_patient:
        from app.database_mongo import dossiers_medicaux_collection
        from datetime import datetime
        dossier_existant = await dossiers_medicaux_collection.find_one({"npi": nouvel_utilisateur.npi_patient})
        if not dossier_existant:
            dossier_vide = {
                "npi": nouvel_utilisateur.npi_patient,
                "nom": nouvel_utilisateur.nom,
                "prenom": nouvel_utilisateur.prenom,
                "date_naissance": datetime.combine(nouvel_utilisateur.date_naissance, datetime.min.time()) if nouvel_utilisateur.date_naissance else None,
                "sexe": nouvel_utilisateur.sexe,
                "groupe_sanguin": nouvel_utilisateur.groupe_sanguin,
                "allergies": [],
                "antecedents": [],
                "traitements_en_cours": [],
                "updated_at": datetime.utcnow()
            }
            await dossiers_medicaux_collection.insert_one(dossier_vide)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action=f"CREATION_COMPTE_{nouvel_utilisateur.role.upper()}",
        statut_action="SUCCES",
        npi_concerne=nouvel_utilisateur.npi_patient
    )

    return nouveau_compte


@router.get("/users", response_model=list[UserOut])
async def lister_utilisateurs(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """
    Liste tous les comptes utilisateurs du réseau DMPI.
    Réservé au Super Administrateur national.
    """
    result = await db.execute(select(User))
    return result.scalars().all()


@router.patch("/users/{user_id}/desactiver", response_model=UserOut)
async def desactiver_utilisateur(
    user_id: int,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """
    Désactive un compte utilisateur (au lieu de le supprimer, pour préserver
    la traçabilité des logs d'audit liés à ce compte).
    """
    result = await db.execute(select(User).where(User.id == user_id))
    utilisateur = result.scalar_one_or_none()

    if not utilisateur:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    utilisateur.est_actif = False
    await db.commit()
    await db.refresh(utilisateur)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="DESACTIVATION_COMPTE",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return utilisateur


@router.patch("/users/{user_id}/activer", response_model=UserOut)
async def activer_utilisateur(
    user_id: int,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """
    Réactive un compte utilisateur.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    utilisateur = result.scalar_one_or_none()

    if not utilisateur:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    utilisateur.est_actif = True
    await db.commit()
    await db.refresh(utilisateur)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="ACTIVATION_COMPTE",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return utilisateur


from app.schemas.user import UserUpdate

@router.patch("/users/{user_id}", response_model=UserOut)
async def modifier_utilisateur(
    user_id: int,
    updates: UserUpdate,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """
    Modifie les informations d'un utilisateur existant (nom, prénom, rôle).
    """
    result = await db.execute(select(User).where(User.id == user_id))
    utilisateur = result.scalar_one_or_none()

    if not utilisateur:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if updates.role and updates.role not in ROLES_VALIDES:
        raise HTTPException(
            status_code=400,
            detail=f"Rôle invalide. Rôles autorisés : {', '.join(ROLES_VALIDES)}"
        )

    if updates.email is not None:
        if updates.email != utilisateur.email:
            existing = await db.execute(select(User).where(User.email == updates.email))
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Un compte avec cet email existe déjà.")
        utilisateur.email = updates.email

    if updates.nom is not None:
        utilisateur.nom = updates.nom
    if updates.prenom is not None:
        utilisateur.prenom = updates.prenom
    if updates.role is not None:
        utilisateur.role = updates.role
    if updates.specialite is not None:
        utilisateur.specialite = updates.specialite
    if updates.service is not None:
        utilisateur.service = updates.service
    if updates.npi_patient is not None:
        utilisateur.npi_patient = updates.npi_patient
    if updates.etablissement_id is not None:
        utilisateur.etablissement_id = updates.etablissement_id

    await db.commit()
    await db.refresh(utilisateur)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="MODIFICATION_COMPTE",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return utilisateur


@router.get("/logs", response_model=list[AuditLogOut])
async def consulter_journal_audit(
    npi: str | None = None,
    utilisateur_email: str | None = None,
    action: str | None = None,
    statut_action: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """
    Console d'audit & logs globaux : accès exclusif à l'intégralité du
    registre de traçabilité (append-only). Réservé au Super Administrateur
    national, pour veiller au respect du secret médical et le volet juridique.
    """
    from sqlalchemy.orm import aliased

    requete = select(AuditLog, User.nom, User.prenom, User.role).outerjoin(
        User, AuditLog.utilisateur_email == User.email
    ).order_by(desc(AuditLog.horodatage))

    if npi:
        requete = requete.where(AuditLog.npi_concerne == npi)
    if utilisateur_email:
        requete = requete.where(AuditLog.utilisateur_email == utilisateur_email)
    if action:
        requete = requete.where(AuditLog.action == action)
    if statut_action:
        # L'UI envoie souvent en minuscules, et on a parfois stocké en MAJUSCULES (ex: "SUCCES")
        # On fait un ILIKE ou on met en majuscules pour s'assurer que ça matche
        requete = requete.where(AuditLog.statut_action.ilike(statut_action))

    requete = requete.offset(skip).limit(min(limit, 500))

    result = await db.execute(requete)
    rows = result.all()
    
    logs_out = []
    for log, nom, prenom, role in rows:
        nom_complet = f"{nom} {prenom}" if nom and prenom else None
        logs_out.append(
            AuditLogOut(
                id=log.id,
                utilisateur_email=log.utilisateur_email,
                utilisateur_nom_complet=nom_complet,
                utilisateur_role=role,
                action=log.action,
                npi_concerne=log.npi_concerne,
                statut_action=log.statut_action,
                horodatage=log.horodatage,
                adresse_ip=log.adresse_ip
            )
        )

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CONSULTATION_JOURNAL_AUDIT",
        statut_action="SUCCES",
        npi_concerne=npi
    )

    return logs_out