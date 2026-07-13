from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from app.database_sql import get_sql_db
from app.database_mongo import (
    dossiers_medicaux_collection,
    consultations_collection,
    etablissements_collection,
    ordonnances_collection,
)
from app.models_sql import User, AuditLog
from app.security import require_role
from app.audit import enregistrer_log

router = APIRouter(
    prefix="/dashboard",
    tags=["Tableaux de bord (Admin établissement / Super Admin)"]
)


def _debut_journee() -> datetime:
    maintenant = datetime.utcnow()
    return datetime(maintenant.year, maintenant.month, maintenant.day)


@router.get("/etablissement")
async def dashboard_etablissement(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("admin_etablissement", "super_admin"))
):
    """
    KPIs et statistiques d'activité locale : suivi opérationnel de
    l'utilisation du système au sein d'un centre de santé.
    """
    debut_jour = _debut_journee()
    
    # Si c'est un super_admin, on lui montre tout (ou on pourrait exiger un etablissement_id en query)
    # Pour le MVP, on filtre si etablissement_id est présent sur le current_user (ce qui est le cas pour admin_etablissement)
    etablissement_id = current_user.etablissement_id
    
    user_filter = True
    if etablissement_id:
        user_filter = (User.etablissement_id == etablissement_id)
        
    total_utilisateurs = await db.scalar(select(func.count()).select_from(User).where(user_filter))
    utilisateurs_actifs = await db.scalar(
        select(func.count()).select_from(User).where(User.est_actif == True, user_filter)
    )

    result_par_role = await db.execute(
        select(User.role, func.count()).where(user_filter).group_by(User.role)
    )
    utilisateurs_par_role = {role: count for role, count in result_par_role.all()}

    mongo_filter = {}
    if etablissement_id:
        mongo_filter = {"etablissement_id": etablissement_id}

    # Pour total_dossiers, on compte les NPI distincts dans les consultations de cet etablissement
    npi_list = await consultations_collection.distinct("npi", mongo_filter)
    total_dossiers = len(npi_list)
    
    consultations_aujourdhui = await consultations_collection.count_documents(
        {**mongo_filter, "created_at": {"$gte": debut_jour}}
    )
    total_consultations = await consultations_collection.count_documents(mongo_filter)

    # Récupérer les activités récentes
    from sqlalchemy import desc
    activites_query = (
        select(AuditLog, User)
        .join(User, AuditLog.utilisateur_email == User.email)
        .where(user_filter)
        .order_by(desc(AuditLog.horodatage))
        .limit(5)
    )
    activites_result = await db.execute(activites_query)
    activite_recente = []
    for alog, u in activites_result.all():
        desc_text = f"{alog.action} " + (f" - NPI {alog.npi_concerne}" if alog.npi_concerne else "")
        activite_recente.append({
            "id": str(alog.id),
            "type": "dossier" if "DOSSIER" in alog.action else "consultation",
            "description": desc_text,
            "utilisateur": f"{u.nom} {u.prenom}",
            "date": alog.horodatage.isoformat() + "Z"
        })
        
    # Alertes : On prend les erreurs récentes comme alertes
    alertes_query = (
        select(AuditLog)
        .join(User, AuditLog.utilisateur_email == User.email)
        .where(user_filter, AuditLog.statut_action != "SUCCES")
        .order_by(desc(AuditLog.horodatage))
        .limit(3)
    )
    alertes_result = await db.execute(alertes_query)
    alertes = []
    for alog in alertes_result.scalars().all():
        alertes.append({
            "id": f"err_{alog.id}",
            "type": "error",
            "message": f"Échec d'action: {alog.action}",
            "date": alog.horodatage.isoformat() + "Z"
        })

    if not alertes:
        alertes.append({
            "id": "sys_1",
            "type": "info",
            "message": "Le système fonctionne normalement.",
            "date": datetime.utcnow().isoformat() + "Z"
        })

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CONSULTATION_DASHBOARD_ETABLISSEMENT",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return {
        "stats": {
            "totalPatients": total_dossiers,
            "consultationsMois": total_consultations, # Approximation pour le MVP
            "ordonnancesMois": consultations_aujourdhui, # Approximation
            "medecinActifs": utilisateurs_par_role.get("medecin", 0),
            "infirmierActifs": utilisateurs_par_role.get("infirmier", 0),
            "tauxOccupation": 0,
        },
        "alertes": alertes,
        "activite_recente": activite_recente,
        "genere_le": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/national")
async def dashboard_national(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """
    Supervision technique et outils analytiques nationaux : vue d'ensemble
    du réseau DMPI pour le Super Administrateur (statistiques épidémiologiques
    de premier niveau pour le Ministère de la Santé).
    """
    debut_jour = _debut_journee()
    debut_semaine = datetime.utcnow() - timedelta(days=7)

    result_par_role = await db.execute(
        select(User.role, func.count()).group_by(User.role)
    )
    utilisateurs_par_role = {role: count for role, count in result_par_role.all()}

    total_dossiers = await dossiers_medicaux_collection.count_documents({})
    total_consultations = await consultations_collection.count_documents({})
    consultations_7_jours = await consultations_collection.count_documents(
        {"created_at": {"$gte": debut_semaine}}
    )

    pipeline_cim10 = [
        {"$group": {"_id": "$diagnostic_cim10", "nombre": {"$sum": 1}}},
        {"$sort": {"nombre": -1}},
        {"$limit": 10},
    ]
    top_diagnostics_cursor = consultations_collection.aggregate(pipeline_cim10)
    top_diagnostics = [
        {"diagnostic_cim10": doc["_id"], "nombre_cas": doc["nombre"]}
        async for doc in top_diagnostics_cursor
    ]

    total_acces_urgence = await db.scalar(
        select(func.count())
        .select_from(AuditLog)
        .where(AuditLog.action == "ACCES_URGENCE_BREAK_THE_GLASS")
    )
    acces_urgence_aujourdhui = await db.scalar(
        select(func.count())
        .select_from(AuditLog)
        .where(
            AuditLog.action == "ACCES_URGENCE_BREAK_THE_GLASS",
            AuditLog.horodatage >= debut_jour,
        )
    )
    
    # Agrégation des données pour les établissements (Consultations & Patients ce mois-ci)
    maintenant = datetime.utcnow()
    debut_mois = datetime(maintenant.year, maintenant.month, 1)
    
    # On récupère d'abord tous les établissements
    etabs_cursor = etablissements_collection.find({"statut": {"$in": ["actif", "inactif"]}})
    etablissements_db = await etabs_cursor.to_list(length=None)
    
    # Agrégation pour les consultations
    pipeline_etabs = [
        {"$match": {"created_at": {"$gte": debut_mois}}},
        {"$group": {
            "_id": "$etablissement_id",
            "consultations_du_mois": {"$sum": 1},
            "npi_uniques": {"$addToSet": "$npi"}
        }},
        {"$project": {
            "etablissement_id": "$_id",
            "consultations_du_mois": 1,
            "patients_total": {"$size": "$npi_uniques"}
        }}
    ]
    
    agg_cursor = consultations_collection.aggregate(pipeline_etabs)
    agg_results = await agg_cursor.to_list(length=None)
    
    stats_par_etab = {
        res["_id"]: {
            "consultations_du_mois": res["consultations_du_mois"],
            "patients_total": res.get("patients_total", 0)
        } for res in agg_results if res["_id"] is not None
    }
    
    etablissements_stats = []
    for etab in etablissements_db:
        etab_id = str(etab["_id"])
        stats = stats_par_etab.get(etab_id, {"consultations_du_mois": 0, "patients_total": 0})
        
        etablissements_stats.append({
            "id": etab_id,
            "nom": etab.get("nom", ""),
            "ville": etab.get("ville", ""),
            "departement": etab.get("departement", ""),
            "type": etab.get("type", "CHU"),
            "statut": etab.get("statut", "actif"),
            "patients": stats["patients_total"],
            "consultationsMois": stats["consultations_du_mois"],
            "derniereSync": etab.get("derniereSync", datetime.utcnow()).isoformat() + "Z" if isinstance(etab.get("derniereSync"), datetime) else etab.get("derniereSync", "")
        })

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CONSULTATION_DASHBOARD_NATIONAL",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return {
        "utilisateurs_par_role": utilisateurs_par_role,
        "activite_clinique": {
            "total_dossiers_patients": total_dossiers,
            "total_consultations": total_consultations,
            "consultations_7_derniers_jours": consultations_7_jours,
        },
        "epidemiologie": {
            "top_diagnostics_cim10": top_diagnostics,
        },
        "urgences": {
            "total_acces_break_the_glass": total_acces_urgence,
            "acces_break_the_glass_aujourdhui": acces_urgence_aujourdhui,
        },
        "etablissements": etablissements_stats,
        "genere_le": maintenant.isoformat() + "Z",
    }

@router.get("/rapports-mensuels")
async def get_rapports_mensuels(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """
    Indicateurs annuels et rapports groupés par mois avec données réelles.
    """
    annee_en_cours = datetime.utcnow().year
    debut_annee = datetime(annee_en_cours, 1, 1)

    # 1. Consultations YTD
    consultations_ytd = await consultations_collection.count_documents({"created_at": {"$gte": debut_annee}})

    # 2. Patients actifs YTD
    pipeline_patients_actifs = [
        {"$match": {"created_at": {"$gte": debut_annee}}},
        {"$group": {"_id": "$npi"}},
        {"$count": "total"}
    ]
    actifs_cursor = consultations_collection.aggregate(pipeline_patients_actifs)
    actifs_list = await actifs_cursor.to_list(length=None)
    patients_actifs = actifs_list[0]["total"] if actifs_list else 0

    # 3. Taux de couverture
    total_dossiers = await dossiers_medicaux_collection.count_documents({})
    taux_couverture = round((patients_actifs / total_dossiers * 100)) if total_dossiers > 0 else 0

    # 4. Etablissements actifs
    etablissements_actifs = await etablissements_collection.count_documents({"statut": "actif"})
    etablissements_total = await etablissements_collection.count_documents({})

    # 5. Ordonnances émises YTD
    ordonnances_emises = await ordonnances_collection.count_documents({"created_at": {"$gte": debut_annee}})

    # 6. Alertes sécurité YTD
    alertes_securite = await db.scalar(
        select(func.count())
        .select_from(AuditLog)
        .where(
            AuditLog.statut_action.in_(["ALERTE", "ECHEC"]),
            AuditLog.horodatage >= debut_annee
        )
    )

    # Top diagnostics CIM-10 par mois
    pipeline_cim10_mensuel = [
        {"$match": {"created_at": {"$gte": debut_annee}}},
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"},
                    "diagnostic_cim10": "$diagnostic_cim10"
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id.year": -1, "_id.month": -1, "count": -1}}
    ]
    cim10_cursor = consultations_collection.aggregate(pipeline_cim10_mensuel)
    cim10_results = await cim10_cursor.to_list(length=None)

    MOIS_NOMS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    
    pipeline_stats_mensuelles = [
        {"$match": {"created_at": {"$gte": debut_annee}}},
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"}
                },
                "consultations": {"$sum": 1},
                "npi_uniques": {"$addToSet": "$npi"}
            }
        },
        {"$sort": {"_id.year": -1, "_id.month": -1}}
    ]
    stats_cursor = consultations_collection.aggregate(pipeline_stats_mensuelles)
    stats_results = await stats_cursor.to_list(length=None)

    rapports_mensuels = []
    
    diagnostics_par_mois = {}
    for doc in cim10_results:
        y = doc["_id"]["year"]
        m = doc["_id"]["month"]
        key = f"{y}-{m}"
        if key not in diagnostics_par_mois:
            diagnostics_par_mois[key] = []
        if len(diagnostics_par_mois[key]) < 5:
            diagnostics_par_mois[key].append({
                "code": doc["_id"]["diagnostic_cim10"],
                "libelle": doc["_id"]["diagnostic_cim10"],
                "count": doc["count"]
            })

    for s in stats_results:
        y = s["_id"]["year"]
        m = s["_id"]["month"]
        key = f"{y}-{m}"
        nom_mois = f"{MOIS_NOMS[m-1]} {y}"
        
        rapports_mensuels.append({
            "mois": nom_mois,
            "consultations": s["consultations"],
            "patients": len(s["npi_uniques"]),
            "ordonnances": 0, 
            "etablissements": etablissements_actifs,
            "tauxCouverture": round((len(s["npi_uniques"]) / total_dossiers * 100)) if total_dossiers > 0 else 0,
            "topDiagnostics": diagnostics_par_mois.get(key, []),
            "topEtablissements": [], 
            "evolutionConsultations": [0,0,0,0,0,0,0] 
        })

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CONSULTATION_RAPPORTS_ANNUELS",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return {
        "cumul_annuel": {
            "consultations_ytd": consultations_ytd,
            "patients_actifs": patients_actifs,
            "taux_couverture": taux_couverture,
            "etablissements_actifs": etablissements_actifs,
            "etablissements_total": etablissements_total,
            "ordonnances_emises": ordonnances_emises,
            "alertes_securite": alertes_securite,
        },
        "rapports_mensuels": rapports_mensuels
    }