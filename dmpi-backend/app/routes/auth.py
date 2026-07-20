from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database_sql import get_sql_db
from app.models_sql import User, DemandeReinitialisationMotDePasse
from app.schemas.user import UserLogin, TokenResponse, ChangerMotDePasseRequest
from app.schemas.reinitialisation_mot_de_passe import DemandeReinitialisationCreate
from app.security import verify_password, hash_password, create_access_token, get_current_user
from app.audit import enregistrer_log

router = APIRouter(
    prefix="/auth",
    tags=["Authentification"]
)

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_sql_db)):
    """
    Connexion par email/mot de passe (MVP : comptes préconfigurés, pas d'inscription).
    """
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.mot_de_passe, user.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect."
        )

    if not user.est_actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte a été désactivé."
        )

    from datetime import datetime
    from app.context import client_ip
    user.derniere_connexion = datetime.utcnow()
    user.derniere_connexion_ip = client_ip.get()
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.email, "role": user.role})

    return TokenResponse(access_token=token, utilisateur=user)


@router.patch("/mon-mot-de-passe")
async def changer_mon_mot_de_passe(
    payload: ChangerMotDePasseRequest,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    """Auto-service : tout utilisateur connecté peut changer son propre mot de passe."""
    if not verify_password(payload.ancien_mot_de_passe, current_user.mot_de_passe_hash):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect.")

    if payload.nouveau_mot_de_passe == payload.ancien_mot_de_passe:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit être différent de l'actuel.")

    current_user.mot_de_passe_hash = hash_password(payload.nouveau_mot_de_passe)
    await db.commit()

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CHANGEMENT_MOT_DE_PASSE",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return {"message": "Mot de passe modifié avec succès."}


@router.post("/mot-de-passe-oublie", status_code=status.HTTP_202_ACCEPTED)
async def demander_reinitialisation_mot_de_passe(
    payload: DemandeReinitialisationCreate,
    db: AsyncSession = Depends(get_sql_db)
):
    """
    Signal "mot de passe oublié" avant authentification — la personne ne
    peut par définition pas prouver qui elle est ici, donc pas de canal
    email/SMS pour vérifier ou notifier automatiquement. Transmis au
    Super Admin national, seul habilité à réinitialiser un mot de passe.

    Réponse volontairement identique que l'email corresponde ou non à un
    compte existant, pour ne jamais révéler quelles adresses sont enregistrées.
    """
    result = await db.execute(select(User).where(User.email == payload.email))
    utilisateur = result.scalar_one_or_none()

    if utilisateur:
        # Pas de doublon : un clic répété (ou une page rafraîchie par erreur)
        # ne doit pas empiler plusieurs demandes identiques dans la file du
        # super_admin.
        deja_en_attente = await db.execute(
            select(DemandeReinitialisationMotDePasse).where(
                DemandeReinitialisationMotDePasse.email == payload.email,
                DemandeReinitialisationMotDePasse.statut == "en_attente"
            )
        )
        if deja_en_attente.scalar_one_or_none() is None:
            db.add(DemandeReinitialisationMotDePasse(email=payload.email))
            await db.commit()

    return {"message": "Si ce compte existe, votre demande a été transmise au Super Administrateur national."}