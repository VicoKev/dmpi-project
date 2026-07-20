from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database_sql import get_sql_db
from app.models_sql import User, DemandeReinitialisationMotDePasse, SignalementCorrectionCompte
from app.schemas.user import UserLogin, TokenResponse, ChangerMotDePasseRequest
from app.schemas.reinitialisation_mot_de_passe import DemandeReinitialisationCreate
from app.schemas.signalement_correction import SignalerCorrectionRequest, SignalementCorrectionOut
from app.security import verify_password, hash_password, create_access_token, get_current_user
from app.audit import enregistrer_log
from app.rate_limit import limiter

router = APIRouter(
    prefix="/auth",
    tags=["Authentification"]
)

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin, db: AsyncSession = Depends(get_sql_db)):
    """
    Connexion par email/mot de passe (MVP : comptes préconfigurés, pas d'inscription).
    Limité à 10 tentatives par minute et par IP pour freiner un essai
    automatisé de mots de passe.
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

    token = create_access_token({"sub": user.email, "role": user.role, "tv": user.token_version})

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
    # Invalide immédiatement tout autre token émis avec l'ancien mot de passe
    # (ex : session volée) plutôt que d'attendre son expiration naturelle (2h).
    current_user.token_version += 1
    await db.commit()

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CHANGEMENT_MOT_DE_PASSE",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return {"message": "Mot de passe modifié avec succès."}


@router.post("/deconnecter-autres-sessions", response_model=TokenResponse)
async def deconnecter_autres_sessions(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    """
    Invalide tout token émis avant maintenant (ex : session oubliée ouverte
    sur un autre appareil), sans devoir changer de mot de passe. La
    révocation ne distingue pas les tokens entre eux (un seul compteur de
    version par compte) : elle invalide donc aussi celui de la requête en
    cours, d'où la réémission immédiate d'un nouveau token pour ne
    déconnecter que les *autres* sessions.
    """
    current_user.token_version += 1
    await db.commit()
    await db.refresh(current_user)

    nouveau_token = create_access_token({
        "sub": current_user.email,
        "role": current_user.role,
        "tv": current_user.token_version,
    })

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="DECONNEXION_AUTRES_SESSIONS",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return TokenResponse(access_token=nouveau_token, utilisateur=current_user)


@router.post("/mot-de-passe-oublie", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("3/hour")
async def demander_reinitialisation_mot_de_passe(
    request: Request,
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
    Limité par IP pour empêcher de faire spammer la file du super_admin.
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


@router.patch("/moi/signaler-correction", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/hour")
async def signaler_correction_compte(
    request: Request,
    payload: SignalerCorrectionRequest,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    """
    Auto-service : signale une erreur sur ses propres informations (faute de
    frappe sur le nom, mauvaise spécialité...). Ces champs restent du
    ressort du super_admin — voir PATCH /admin/users/{id} — ce signal lui
    transmet juste de quoi corriger sans devoir être contacté hors application.
    """
    # Pas de doublon : inutile d'empiler plusieurs signalements identiques
    # tant que le précédent n'a pas été traité.
    deja_en_attente = await db.execute(
        select(SignalementCorrectionCompte).where(
            SignalementCorrectionCompte.utilisateur_id == current_user.id,
            SignalementCorrectionCompte.statut == "en_attente"
        )
    )
    existant = deja_en_attente.scalar_one_or_none()
    if existant:
        existant.motif = payload.motif
    else:
        db.add(SignalementCorrectionCompte(utilisateur_id=current_user.id, motif=payload.motif))
    await db.commit()

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="SIGNALEMENT_CORRECTION_COMPTE",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return {"message": "Signalement transmis au Super Administrateur national."}


@router.get("/mes-signalements-correction", response_model=list[SignalementCorrectionOut])
async def mes_signalements_correction(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    """
    Historique des signalements de correction faits par l'utilisateur
    connecté, du plus récent au plus ancien — lui permet de savoir si un
    signalement a été traité sans avoir à deviner. Consulter cette liste
    marque les résolutions comme vues.
    """
    result = await db.execute(
        select(SignalementCorrectionCompte)
        .where(SignalementCorrectionCompte.utilisateur_id == current_user.id)
        .order_by(SignalementCorrectionCompte.date_creation.desc())
    )
    signalements = result.scalars().all()

    a_marquer_vus = [s for s in signalements if not s.vu]
    if a_marquer_vus:
        for s in a_marquer_vus:
            s.vu = True
        await db.commit()

    return signalements