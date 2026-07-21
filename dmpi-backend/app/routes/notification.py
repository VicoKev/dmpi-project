"""
Cloche de notifications — pas de budget pour un vrai canal SMS/email, donc
plutôt qu'un flux d'événements à envoyer, on agrège en direct ce qui est
réellement "en attente" pour l'utilisateur connecté, à partir des données
déjà existantes (aucun nouveau stockage, donc aucun risque de désynchronisation
pour la grande majorité des éléments).
Chaque élément concerne par défaut une action encore ouverte : un rendez-vous
à confirmer reste dans la liste tant qu'il n'est pas confirmé, etc. — il ne
peut disparaître qu'en résolvant réellement le problème, jamais en le masquant.

Exception volontaire : les éléments purement informatifs (voir
CLES_MARQUABLES_VUES) peuvent être masqués manuellement via POST /marquer-vu,
d'où le seul stockage propre à ce module, NotificationVue.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database_mongo import get_mongo_db
from app.database_sql import get_sql_db
from app.models_sql import (
    User,
    DemandeAccesPatient,
    DemandeReinitialisationMotDePasse,
    SignalementCorrectionCompte,
    NotificationVue,
)
from app.security import get_current_user
from app.schemas.notification import ElementNotification, NotificationsResponse, MarquerNotificationVueRequest

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

# Seules ces notifications sont purement informatives (rien à résoudre, juste
# à consulter) — les autres restent affichées tant que leur cause réelle
# n'est pas traitée, pour ne jamais perdre de vue une action encore en attente.
CLES_MARQUABLES_VUES = {"resultats_disponibles", "resultats_a_revoir"}


async def _reference_ids_vus(db_sql: AsyncSession, utilisateur_id: int, cle: str) -> set[str]:
    resultat = await db_sql.execute(
        select(NotificationVue.reference_id).where(
            NotificationVue.utilisateur_id == utilisateur_id,
            NotificationVue.cle == cle,
        )
    )
    return {r for (r,) in resultat.all()}


async def _notifications_patient(user: User, db: AsyncIOMotorDatabase, db_sql: AsyncSession) -> list[ElementNotification]:
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

    resultats = await db["demandes_examen"].find(
        {"npi": npi, "statut": "traitee"}, {"_id": 1}
    ).to_list(length=1000)
    vus = await _reference_ids_vus(db_sql, user.id, "resultats_disponibles")
    nb_resultats = sum(1 for d in resultats if str(d["_id"]) not in vus)
    if nb_resultats:
        elements.append(ElementNotification(
            cle="resultats_disponibles", titre=f"{nb_resultats} résultat(s) d'examen disponible(s)", compte=nb_resultats,
            lien="/patient/resultats", icone="lab_panel", urgence="info", peut_marquer_vu=True,
        ))

    nb_problemes = await db["demandes_examen"].count_documents({"npi": npi, "probleme_signale": True})
    if nb_problemes:
        elements.append(ElementNotification(
            cle="examens_probleme", titre=f"{nb_problemes} examen(s) avec un problème signalé", compte=nb_problemes,
            lien="/patient/resultats", icone="report", urgence="error",
        ))

    return elements


async def _notifications_medecin(user: User, db: AsyncIOMotorDatabase, db_sql: AsyncSession) -> list[ElementNotification]:
    elements = []

    nb_assignes = await db["file_attente"].count_documents({"medecin_email": user.email, "statut": "assigne"})
    if nb_assignes:
        elements.append(ElementNotification(
            cle="patients_en_attente", titre=f"{nb_assignes} patient(s) en attente de consultation", compte=nb_assignes,
            lien="/medecin", icone="groups", urgence="warning",
        ))

    # "statut" exclut les rendez-vous annulés/effectués : annuler() ne
    # réinitialise pas confirmation_patient (seul modifier() le fait, en
    # reprogrammant), sans quoi un empêchement resterait compté indéfiniment
    # même après que le médecin ait choisi d'annuler plutôt que reprogrammer.
    nb_empechements = await db["rendez_vous"].count_documents({
        "medecin_email": user.email, "confirmation_patient": "empechement", "statut": "confirme",
    })
    if nb_empechements:
        elements.append(ElementNotification(
            cle="rdv_empechement", titre=f"{nb_empechements} rendez-vous à reprogrammer", compte=nb_empechements,
            lien="/medecin/agenda", icone="event_busy", urgence="warning",
        ))

    resultats = await db["demandes_examen"].find(
        {"medecin_email": user.email, "statut": "traitee"}, {"_id": 1}
    ).to_list(length=1000)
    vus = await _reference_ids_vus(db_sql, user.id, "resultats_a_revoir")
    nb_resultats = sum(1 for d in resultats if str(d["_id"]) not in vus)
    if nb_resultats:
        elements.append(ElementNotification(
            cle="resultats_a_revoir", titre=f"{nb_resultats} résultat(s) d'examen à consulter", compte=nb_resultats,
            lien="/medecin/examens", icone="lab_panel", urgence="info", peut_marquer_vu=True,
        ))

    nb_problemes = await db["demandes_examen"].count_documents({"medecin_email": user.email, "probleme_signale": True})
    if nb_problemes:
        elements.append(ElementNotification(
            cle="examens_probleme", titre=f"{nb_problemes} examen(s) avec un problème signalé", compte=nb_problemes,
            lien="/medecin/examens", icone="report", urgence="error",
        ))

    return elements


async def _notifications_infirmier(user: User, db: AsyncIOMotorDatabase, db_sql: AsyncSession) -> list[ElementNotification]:
    if not user.etablissement_id:
        return []
    elements = []

    nb_attente = await db["file_attente"].count_documents({
        "etablissement_id": user.etablissement_id, "statut": "en_attente",
    })
    if nb_attente:
        elements.append(ElementNotification(
            cle="patients_a_trier", titre=f"{nb_attente} patient(s) en attente de prise en charge", compte=nb_attente,
            lien="/infirmier/file-attente", icone="groups", urgence="warning",
        ))

    # Un médecin peut se déclarer indisponible après avoir reçu une
    # assignation — rien ne réassigne ou n'annule automatiquement l'entrée
    # (voir PATCH /file-attente/ma-disponibilite), donc sans ce signal le
    # patient continue d'attendre un médecin qui ne viendra pas, sans que
    # l'infirmier n'ait aucun moyen de le savoir avant de vérifier lui-même.
    resultat = await db_sql.execute(
        select(User.email).where(
            User.etablissement_id == user.etablissement_id,
            User.role == "medecin",
            User.disponible == False,  # noqa: E712
        )
    )
    emails_indisponibles = [email for (email,) in resultat.all()]
    nb_medecin_indisponible = 0
    if emails_indisponibles:
        nb_medecin_indisponible = await db["file_attente"].count_documents({
            "etablissement_id": user.etablissement_id,
            "statut": "assigne",
            "medecin_email": {"$in": emails_indisponibles},
        })
    if nb_medecin_indisponible:
        elements.append(ElementNotification(
            cle="patients_medecin_indisponible",
            titre=f"{nb_medecin_indisponible} patient(s) assigné(s) à un médecin devenu indisponible",
            compte=nb_medecin_indisponible,
            lien="/infirmier/file-attente", icone="person_off", urgence="error",
        ))

    return elements


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
        elements = await _notifications_patient(current_user, db_mongo, db_sql)
    elif current_user.role == "medecin":
        elements = await _notifications_medecin(current_user, db_mongo, db_sql)
    elif current_user.role == "infirmier":
        elements = await _notifications_infirmier(current_user, db_mongo, db_sql)
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


@router.post("/marquer-vu")
async def marquer_notification_vue(
    payload: MarquerNotificationVueRequest,
    db_mongo: AsyncIOMotorDatabase = Depends(get_mongo_db),
    db_sql: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user),
):
    """
    Masque tous les éléments qui composent actuellement une notification
    informative pour l'utilisateur connecté. Recalcule lui-même l'ensemble
    concerné plutôt que de faire confiance à une liste fournie par le
    frontend — évite qu'un appel direct à l'API ne masque autre chose que ce
    que l'utilisateur avait réellement sous les yeux.

    Volontairement limité à CLES_MARQUABLES_VUES : les autres notifications
    signalent une action encore non faite et ne doivent disparaître qu'en
    la résolvant, jamais en la masquant.
    """
    if payload.cle not in CLES_MARQUABLES_VUES:
        raise HTTPException(status_code=400, detail="Cette notification ne peut pas être marquée comme vue.")

    if payload.cle == "resultats_a_revoir":
        if current_user.role != "medecin":
            raise HTTPException(status_code=403, detail="Non autorisé.")
        filtre = {"medecin_email": current_user.email, "statut": "traitee"}
    else:  # "resultats_disponibles"
        if current_user.role != "patient" or not current_user.npi_patient:
            raise HTTPException(status_code=403, detail="Non autorisé.")
        filtre = {"npi": current_user.npi_patient, "statut": "traitee"}

    documents = await db_mongo["demandes_examen"].find(filtre, {"_id": 1}).to_list(length=1000)
    if documents:
        valeurs = [
            {"utilisateur_id": current_user.id, "cle": payload.cle, "reference_id": str(d["_id"])}
            for d in documents
        ]
        requete = pg_insert(NotificationVue).values(valeurs)
        requete = requete.on_conflict_do_nothing(constraint="uq_notification_vue")
        await db_sql.execute(requete)
        await db_sql.commit()

    return {"message": "Notification marquée comme vue."}
