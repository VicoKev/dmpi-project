from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timedelta
from app.database_sql import get_sql_db
from app.models_sql import User, DelegationAcces
from app.schemas.delegation import DelegationCreate, DelegationOut
from app.security import get_current_user, require_role
from app.audit import enregistrer_log

router = APIRouter(
    prefix="/delegations",
    tags=["Délégation d'accès entre confrères"]
)


@router.post("/", response_model=DelegationOut, status_code=status.HTTP_201_CREATED)
async def creer_delegation(
    delegation: DelegationCreate,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("medecin", "infirmier"))
):
    """
    Habilite temporairement un confrère sur un dossier patient précis
    (ex: absence, congé, garde). Traçable et révocable à tout moment.
    """
    result = await db.execute(
        select(User).where(User.email == delegation.beneficiaire_email)
    )
    beneficiaire = result.scalar_one_or_none()

    if not beneficiaire:
        raise HTTPException(
            status_code=404,
            detail="Aucun compte professionnel trouvé pour cet email bénéficiaire."
        )

    if beneficiaire.role not in ("medecin", "infirmier"):
        raise HTTPException(
            status_code=400,
            detail="La délégation ne peut être accordée qu'à un médecin ou un infirmier."
        )

    if beneficiaire.email == current_user.email:
        raise HTTPException(
            status_code=400,
            detail="Vous ne pouvez pas vous déléguer un accès à vous-même."
        )

    maintenant = datetime.utcnow()
    nouvelle_delegation = DelegationAcces(
        delegant_email=current_user.email,
        beneficiaire_email=delegation.beneficiaire_email,
        npi_patient=delegation.npi_patient,
        motif=delegation.motif,
        date_debut=maintenant,
        date_fin=maintenant + timedelta(hours=delegation.duree_heures),
        active=True
    )

    db.add(nouvelle_delegation)
    await db.commit()
    await db.refresh(nouvelle_delegation)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CREATION_DELEGATION_ACCES",
        statut_action="SUCCES",
        npi_concerne=delegation.npi_patient
    )

    return nouvelle_delegation


@router.get("/donnees", response_model=list[DelegationOut])
async def mes_delegations_donnees(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    """Liste des délégations que j'ai accordées à d'autres confrères."""
    result = await db.execute(
        select(DelegationAcces)
        .where(DelegationAcces.delegant_email == current_user.email)
        .order_by(desc(DelegationAcces.date_creation))
    )
    return result.scalars().all()


@router.get("/recues", response_model=list[DelegationOut])
async def delegations_recues(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    """Liste des délégations qui m'ont été accordées par des confrères."""
    result = await db.execute(
        select(DelegationAcces)
        .where(DelegationAcces.beneficiaire_email == current_user.email)
        .order_by(desc(DelegationAcces.date_creation))
    )
    return result.scalars().all()


@router.patch("/{delegation_id}/revoquer", response_model=DelegationOut)
async def revoquer_delegation(
    delegation_id: int,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    """
    Révocation anticipée d'une délégation, avant son expiration naturelle.
    Seul le délégant (ou un super admin) peut révoquer.
    """
    result = await db.execute(
        select(DelegationAcces).where(DelegationAcces.id == delegation_id)
    )
    delegation = result.scalar_one_or_none()

    if not delegation:
        raise HTTPException(status_code=404, detail="Délégation introuvable.")

    if delegation.delegant_email != current_user.email and current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Seul le délégant ou un super administrateur peut révoquer cette délégation."
        )

    delegation.active = False
    await db.commit()
    await db.refresh(delegation)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="REVOCATION_DELEGATION_ACCES",
        statut_action="SUCCES",
        npi_concerne=delegation.npi_patient
    )

    return delegation