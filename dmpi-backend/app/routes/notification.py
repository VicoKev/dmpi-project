"""
Cloche de notifications — pas de budget pour un vrai canal SMS/email, donc
plutôt qu'un flux d'événements à envoyer, on agrège en direct ce qui est
réellement "en attente" pour l'utilisateur connecté, à partir des données
déjà existantes (aucun nouveau stockage, donc aucun risque de désynchronisation).
Chaque élément ne concerne que des actions encore ouvertes : un rendez-vous
à confirmer reste dans la liste tant qu'il n'est pas confirmé, un résultat
disponible tant que personne n'a de moyen de le "marquer comme vu" (l'app
n'a pas cette notion), etc.
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database_mongo import get_mongo_db
from app.database_sql import get_sql_db
from app.models_sql import User, DemandeAccesPatient, DemandeReinitialisationMotDePasse, SignalementCorrectionCompte
from app.security import get_current_user
from app.schemas.notification import ElementNotification, NotificationsResponse

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


async def _notifications_patient(user: User, db: AsyncIOMotorDatabase) -> list[ElementNotification]:
    if not user.npi_patient:
        return []
    npi = user.npi_patient
    maintenant = datetime.utcnow().isoformat()
    elements = []

    nb_rdv = await db["rendez_vous"].count_documents({
        "npi_patient": npi, "statut": "confirme",
        "confirmation_patient": "en_attente", "date_rdv": {"$gte": maintenant},
    })
    if nb_rdv:
        elements.append(ElementNotification(
            cle="rdv_a_confirmer", titre=f"{nb_rdv} rendez-vous à confirmer", compte=nb_rdv,
            lien="/patient/rendez-vous", icone="event", urgence="warning",
        ))

    nb_resultats = await db["demandes_examen"].count_documents({"npi": npi, "statut": "traitee"})
    if nb_resultats:
        elements.append(ElementNotification(
            cle="resultats_disponibles", titre=f"{nb_resultats} résultat(s) d'examen disponible(s)", compte=nb_resultats,
            lien="/patient/resultats", icone="lab_panel", urgence="info",
        ))

    nb_problemes = await db["demandes_examen"].count_documents({"npi": npi, "probleme_signale": True})
    if nb_problemes:
        elements.append(ElementNotification(
            cle="examens_probleme", titre=f"{nb_problemes} examen(s) avec un problème signalé", compte=nb_problemes,
            lien="/patient/resultats", icone="report", urgence="error",
        ))

    return elements


async def _notifications_medecin(user: User, db: AsyncIOMotorDatabase) -> list[ElementNotification]:
    elements = []

    nb_assignes = await db["file_attente"].count_documents({"medecin_email": user.email, "statut": "assigne"})
    if nb_assignes:
        elements.append(ElementNotification(
            cle="patients_en_attente", titre=f"{nb_assignes} patient(s) en attente de consultation", compte=nb_assignes,
            lien="/medecin", icone="groups", urgence="warning",
        ))

    nb_empechements = await db["rendez_vous"].count_documents({"medecin_email": user.email, "confirmation_patient": "empechement"})
    if nb_empechements:
        elements.append(ElementNotification(
            cle="rdv_empechement", titre=f"{nb_empechements} rendez-vous à reprogrammer", compte=nb_empechements,
            lien="/medecin/agenda", icone="event_busy", urgence="warning",
        ))

    nb_resultats = await db["demandes_examen"].count_documents({"medecin_email": user.email, "statut": "traitee"})
    if nb_resultats:
        elements.append(ElementNotification(
            cle="resultats_a_revoir", titre=f"{nb_resultats} résultat(s) d'examen à consulter", compte=nb_resultats,
            lien="/medecin/examens", icone="lab_panel", urgence="info",
        ))

    nb_problemes = await db["demandes_examen"].count_documents({"medecin_email": user.email, "probleme_signale": True})
    if nb_problemes:
        elements.append(ElementNotification(
            cle="examens_probleme", titre=f"{nb_problemes} examen(s) avec un problème signalé", compte=nb_problemes,
            lien="/medecin/examens", icone="report", urgence="error",
        ))

    return elements


async def _notifications_infirmier(user: User, db: AsyncIOMotorDatabase) -> list[ElementNotification]:
    if not user.etablissement_id:
        return []
    nb_attente = await db["file_attente"].count_documents({
        "etablissement_id": user.etablissement_id, "statut": "en_attente",
    })
    if not nb_attente:
        return []
    return [ElementNotification(
        cle="patients_a_trier", titre=f"{nb_attente} patient(s) en attente de prise en charge", compte=nb_attente,
        lien="/infirmier/file-attente", icone="groups", urgence="warning",
    )]


async def _notifications_laboratoire(user: User, db: AsyncIOMotorDatabase) -> list[ElementNotification]:
    if not user.prestataire_id:
        return []
    nb_attente = await db["demandes_examen"].count_documents({
        "prestataire_id": user.prestataire_id, "statut": "en_attente", "probleme_signale": False,
    })
    if not nb_attente:
        return []
    return [ElementNotification(
        cle="demandes_a_traiter", titre=f"{nb_attente} demande(s) d'examen à traiter", compte=nb_attente,
        lien="/laboratoire", icone="science", urgence="warning",
    )]


async def _notifications_admin_etablissement(user: User, db: AsyncSession) -> list[ElementNotification]:
    if not user.etablissement_id:
        return []
    resultat = await db.execute(
        select(func.count()).select_from(DemandeAccesPatient).where(
            DemandeAccesPatient.etablissement_id == user.etablissement_id,
            DemandeAccesPatient.statut == "en_attente",
        )
    )
    nb = resultat.scalar_one()
    if not nb:
        return []
    return [ElementNotification(
        cle="demandes_acces_en_attente", titre=f"{nb} demande(s) d'accès en attente", compte=nb,
        lien="/admin/demandes-acces", icone="how_to_reg", urgence="warning",
    )]


async def _notifications_super_admin(db: AsyncSession) -> list[ElementNotification]:
    elements = []

    resultat = await db.execute(
        select(func.count()).select_from(DemandeAccesPatient).where(DemandeAccesPatient.statut == "en_attente")
    )
    nb = resultat.scalar_one()
    if nb:
        elements.append(ElementNotification(
            cle="demandes_acces_en_attente", titre=f"{nb} demande(s) d'accès en attente", compte=nb,
            lien="/superadmin/demandes-acces", icone="how_to_reg", urgence="warning",
        ))

    resultat_mdp = await db.execute(
        select(func.count()).select_from(DemandeReinitialisationMotDePasse).where(
            DemandeReinitialisationMotDePasse.statut == "en_attente"
        )
    )
    nb_mdp = resultat_mdp.scalar_one()
    if nb_mdp:
        elements.append(ElementNotification(
            cle="demandes_reinitialisation_mdp_en_attente", titre=f"{nb_mdp} mot(s) de passe oublié(s) à réinitialiser", compte=nb_mdp,
            lien="/superadmin/utilisateurs", icone="lock_reset", urgence="warning",
        ))

    resultat_corrections = await db.execute(
        select(func.count()).select_from(SignalementCorrectionCompte).where(
            SignalementCorrectionCompte.statut == "en_attente"
        )
    )
    nb_corrections = resultat_corrections.scalar_one()
    if nb_corrections:
        elements.append(ElementNotification(
            cle="corrections_compte_signalees", titre=f"{nb_corrections} correction(s) de compte signalée(s)", compte=nb_corrections,
            lien="/superadmin/utilisateurs", icone="edit_note", urgence="info",
        ))

    return elements


async def _notifications_signalements_resolus(user: User, db: AsyncSession) -> list[ElementNotification]:
    """
    Commun à tous les rôles : signale qu'un signalement de correction que
    CET utilisateur a lui-même soumis vient d'être traité — contrairement
    aux autres éléments (toujours orientés vers une action à faire), celui-ci
    est purement informatif, d'où le besoin d'un indicateur "vu" pour ne pas
    rester affiché indéfiniment une fois consulté (voir GET /auth/mes-signalements-correction).
    """
    resultat = await db.execute(
        select(func.count()).select_from(SignalementCorrectionCompte).where(
            SignalementCorrectionCompte.utilisateur_id == user.id,
            SignalementCorrectionCompte.statut == "traitee",
            SignalementCorrectionCompte.vu == False,  # noqa: E712
        )
    )
    nb = resultat.scalar_one()
    if not nb:
        return []
    return [ElementNotification(
        cle="mes_signalements_resolus", titre=f"{nb} signalement(s) de correction traité(s)", compte=nb,
        lien="/mes-signalements", icone="task_alt", urgence="info",
    )]


@router.get("/moi", response_model=NotificationsResponse)
async def mes_notifications(
    db_mongo: AsyncIOMotorDatabase = Depends(get_mongo_db),
    db_sql: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user),
):
    """Éléments actuellement en attente d'action pour l'utilisateur connecté, selon son rôle."""
    if current_user.role == "patient":
        elements = await _notifications_patient(current_user, db_mongo)
    elif current_user.role == "medecin":
        elements = await _notifications_medecin(current_user, db_mongo)
    elif current_user.role == "infirmier":
        elements = await _notifications_infirmier(current_user, db_mongo)
    elif current_user.role == "laboratoire":
        elements = await _notifications_laboratoire(current_user, db_mongo)
    elif current_user.role == "admin_etablissement":
        elements = await _notifications_admin_etablissement(current_user, db_sql)
    elif current_user.role == "super_admin":
        elements = await _notifications_super_admin(db_sql)
    else:
        elements = []

    # Commun à tous les rôles, y compris super_admin : la résolution de son
    # propre signalement de correction, indépendamment de ce que son rôle
    # a par ailleurs en attente.
    elements = elements + await _notifications_signalements_resolus(current_user, db_sql)

    return NotificationsResponse(total=sum(e.compte for e in elements), elements=elements)
