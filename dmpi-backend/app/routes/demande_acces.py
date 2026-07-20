from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.database_sql import get_sql_db
from app.database_mongo import dossiers_medicaux_collection
from app.models_sql import User, DemandeAccesPatient
from app.schemas.demande_acces import DemandeAccesCreate, DemandeAccesOut, RejeterDemandeRequest
from app.security import require_role
from app.audit import enregistrer_log

router = APIRouter(
    prefix="/demandes-acces",
    tags=["Demandes d'accès patient"]
)


@router.post("/", response_model=DemandeAccesOut, status_code=status.HTTP_201_CREATED)
async def creer_demande_acces(
    demande: DemandeAccesCreate,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("medecin", "infirmier"))
):
    """
    Signale qu'un patient (dossier déjà existant) souhaite un accès portail.
    Le compte de connexion lui-même n'est créé que par le Super Admin.
    """
    dossier = await dossiers_medicaux_collection.find_one({"npi": demande.npi})
    if not dossier:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun dossier médical trouvé pour le NPI {demande.npi}. Créez le dossier avant de demander un accès."
        )

    result = await db.execute(
        select(DemandeAccesPatient).where(
            DemandeAccesPatient.npi == demande.npi,
            DemandeAccesPatient.statut == "en_attente"
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Une demande d'accès est déjà en attente pour ce patient."
        )

    compte_existant = await db.execute(select(User).where(User.npi_patient == demande.npi))
    if compte_existant.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Ce patient dispose déjà d'un compte de connexion."
        )

    nouvelle_demande = DemandeAccesPatient(
        npi=demande.npi,
        nom=demande.nom,
        prenom=demande.prenom,
        telephone_contact=demande.telephone_contact,
        demandeur_email=current_user.email,
        etablissement_id=current_user.etablissement_id,
        statut="en_attente"
    )
    db.add(nouvelle_demande)
    await db.commit()
    await db.refresh(nouvelle_demande)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CREATION_DEMANDE_ACCES_PATIENT",
        statut_action="SUCCES",
        npi_concerne=demande.npi
    )

    return nouvelle_demande


@router.get("/", response_model=list[DemandeAccesOut])
async def lister_demandes_acces(
    statut: str | None = "en_attente",
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """Liste des demandes d'accès, filtrable par statut (par défaut : en attente)."""
    requete = select(DemandeAccesPatient).order_by(desc(DemandeAccesPatient.date_creation))
    if statut:
        requete = requete.where(DemandeAccesPatient.statut == statut)

    result = await db.execute(requete)
    return result.scalars().all()


@router.get("/mon-etablissement", response_model=list[DemandeAccesOut])
async def lister_demandes_acces_mon_etablissement(
    response: Response,
    statut: str | None = None,
    skip: int = 0,
    limit: int | None = None,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("admin_etablissement"))
):
    """
    Demandes d'accès émises par le personnel de l'établissement de l'admin
    connecté, tous demandeurs confondus — vue de supervision en lecture
    seule (rejeter/annuler restent du ressort du super_admin et du demandeur).
    Tous statuts confondus par défaut (pas seulement "en_attente"), donc
    contrairement à la file du super_admin, cette liste ne s'autolimite pas
    avec le temps : skip/limit existent pour ça.
    """
    if not current_user.etablissement_id:
        return []

    filtres = [DemandeAccesPatient.etablissement_id == current_user.etablissement_id]
    if statut:
        filtres.append(DemandeAccesPatient.statut == statut)

    requete_count = select(func.count()).select_from(DemandeAccesPatient)
    for f in filtres:
        requete_count = requete_count.where(f)
    total = (await db.execute(requete_count)).scalar_one()
    response.headers["X-Total-Count"] = str(total)

    requete = select(DemandeAccesPatient).order_by(desc(DemandeAccesPatient.date_creation))
    for f in filtres:
        requete = requete.where(f)
    requete = requete.offset(skip)
    if limit is not None:
        requete = requete.limit(min(limit, 200))

    result = await db.execute(requete)
    return result.scalars().all()


@router.get("/compte-existant/{npi}")
async def compte_existant_pour_npi(
    npi: str,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("medecin", "infirmier", "super_admin"))
):
    """
    Indique si un compte de connexion est déjà lié à ce NPI, sans exposer son identité
    (email, etc.) — sert uniquement à décider d'afficher ou non le bouton de demande d'accès.
    """
    result = await db.execute(select(User).where(User.npi_patient == npi))
    return {"npi": npi, "a_un_compte": result.scalar_one_or_none() is not None}


@router.get("/mes-demandes", response_model=list[DemandeAccesOut])
async def lister_mes_demandes_acces(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("medecin", "infirmier"))
):
    """Demandes d'accès que le professionnel connecté a lui-même soumises, tous statuts confondus."""
    result = await db.execute(
        select(DemandeAccesPatient)
        .where(DemandeAccesPatient.demandeur_email == current_user.email)
        .order_by(desc(DemandeAccesPatient.date_creation))
    )
    return result.scalars().all()


@router.patch("/{demande_id}/rejeter", response_model=DemandeAccesOut)
async def rejeter_demande_acces(
    demande_id: int,
    payload: RejeterDemandeRequest | None = None,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    result = await db.execute(select(DemandeAccesPatient).where(DemandeAccesPatient.id == demande_id))
    demande = result.scalar_one_or_none()

    if not demande:
        raise HTTPException(status_code=404, detail="Demande introuvable.")

    demande.statut = "rejete"
    demande.motif_rejet = payload.motif.strip() if payload and payload.motif and payload.motif.strip() else None
    await db.commit()
    await db.refresh(demande)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="REJET_DEMANDE_ACCES_PATIENT",
        statut_action="SUCCES",
        npi_concerne=demande.npi
    )

    return demande


@router.patch("/{demande_id}/annuler", response_model=DemandeAccesOut)
async def annuler_demande_acces(
    demande_id: int,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("medecin", "infirmier"))
):
    """Le professionnel à l'origine d'une demande peut l'annuler tant qu'elle est en attente."""
    result = await db.execute(select(DemandeAccesPatient).where(DemandeAccesPatient.id == demande_id))
    demande = result.scalar_one_or_none()

    if not demande:
        raise HTTPException(status_code=404, detail="Demande introuvable.")

    if demande.demandeur_email != current_user.email:
        raise HTTPException(status_code=403, detail="Seul l'auteur de la demande peut l'annuler.")

    if demande.statut != "en_attente":
        raise HTTPException(status_code=400, detail="Seule une demande en attente peut être annulée.")

    demande.statut = "annulee"
    await db.commit()
    await db.refresh(demande)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="ANNULATION_DEMANDE_ACCES_PATIENT",
        statut_action="SUCCES",
        npi_concerne=demande.npi
    )

    return demande
