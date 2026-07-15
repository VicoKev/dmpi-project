from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
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
