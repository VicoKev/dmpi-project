from fastapi import APIRouter, Depends, Response
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
from app.cim10_data import libelle_cim10
from app.rapport_export import generer_pdf, generer_excel

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

    npi_list = await consultations_collection.distinct("npi", mongo_filter)
    total_dossiers = len(npi_list)
    
    consultations_aujourdhui = await consultations_collection.count_documents(
        {**mongo_filter, "created_at": {"$gte": debut_jour}}
    )
    total_consultations = await consultations_collection.count_documents(mongo_filter)

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
    
    maintenant = datetime.utcnow()
    debut_mois = datetime(maintenant.year, maintenant.month, 1)

    etabs_cursor = etablissements_collection.find({"statut": {"$in": ["actif", "inactif"]}})
    etablissements_db = await etabs_cursor.to_list(length=None)

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

MOIS_NOMS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]


async def _cumul_periode(db: AsyncSession, debut: datetime, fin: datetime) -> dict:
    """Métriques 'flux' (comparables d'une période à l'autre) sur [debut, fin)."""
    filtre_dates = {"created_at": {"$gte": debut, "$lt": fin}}

    consultations = await consultations_collection.count_documents(filtre_dates)

    pipeline_patients = [
        {"$match": filtre_dates},
        {"$group": {"_id": "$npi"}},
        {"$count": "total"}
    ]
    patients_list = await consultations_collection.aggregate(pipeline_patients).to_list(length=None)
    patients_actifs = patients_list[0]["total"] if patients_list else 0

    ordonnances = await ordonnances_collection.count_documents(filtre_dates)

    alertes = await db.scalar(
        select(func.count())
        .select_from(AuditLog)
        .where(
            AuditLog.statut_action.in_(["ALERTE", "ECHEC"]),
            AuditLog.horodatage >= debut,
            AuditLog.horodatage < fin,
        )
    )

    return {
        "consultations": consultations,
        "patients_actifs": patients_actifs,
        "ordonnances": ordonnances,
        "alertes": alertes,
    }


def _variation_pct(actuel: float, precedent: float) -> float | None:
    if precedent <= 0:
        return None
    return round((actuel - precedent) / precedent * 100)


async def _construire_rapport_annuel(db: AsyncSession) -> dict:
    """
    Construit l'intégralité du rapport annuel (cumul + détail mensuel) à partir
    de données réelles PostgreSQL/MongoDB. Partagé entre l'endpoint JSON et les
    exports PDF/Excel pour ne jamais désynchroniser les deux.
    """
    maintenant = datetime.utcnow()
    annee_en_cours = maintenant.year
    debut_annee = datetime(annee_en_cours, 1, 1)

    try:
        fin_periode_precedente = maintenant.replace(year=annee_en_cours - 1)
    except ValueError:  # 29 février sans équivalent l'année précédente
        fin_periode_precedente = maintenant.replace(year=annee_en_cours - 1, day=28)
    debut_annee_precedente = datetime(annee_en_cours - 1, 1, 1)

    cumul_actuel = await _cumul_periode(db, debut_annee, maintenant)
    cumul_precedent = await _cumul_periode(db, debut_annee_precedente, fin_periode_precedente)

    total_dossiers = await dossiers_medicaux_collection.count_documents({})
    taux_couverture = round((cumul_actuel["patients_actifs"] / total_dossiers * 100)) if total_dossiers > 0 else 0
    taux_couverture_precedent = round((cumul_precedent["patients_actifs"] / total_dossiers * 100)) if total_dossiers > 0 else 0

    etablissements_actifs = await etablissements_collection.count_documents({"statut": "actif"})
    etablissements_total = await etablissements_collection.count_documents({})

    etabs_cursor = etablissements_collection.find({}, {"nom": 1, "departement": 1, "type": 1, "statut": 1})
    etablissements_meta = {
        str(e["_id"]): {
            "nom": e.get("nom", "Établissement inconnu"),
            "departement": e.get("departement") or "Non renseigné",
            "type": e.get("type") or "Non renseigné",
            "actif": e.get("statut") == "actif",
        }
        async for e in etabs_cursor
    }
    noms_etablissements = {eid: meta["nom"] for eid, meta in etablissements_meta.items()}

    # Top diagnostics CIM-10 par mois
    pipeline_cim10 = [
        {"$match": {"created_at": {"$gte": debut_annee}}},
        {"$group": {
            "_id": {"year": {"$year": "$created_at"}, "month": {"$month": "$created_at"}, "code": "$diagnostic_cim10"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.year": -1, "_id.month": -1, "count": -1}}
    ]
    cim10_results = await consultations_collection.aggregate(pipeline_cim10).to_list(length=None)
    diagnostics_par_mois: dict[str, list[dict]] = {}
    for doc in cim10_results:
        key = f"{doc['_id']['year']}-{doc['_id']['month']}"
        bucket = diagnostics_par_mois.setdefault(key, [])
        if len(bucket) < 5:
            code = doc["_id"]["code"]
            bucket.append({"code": code, "libelle": libelle_cim10(code), "count": doc["count"]})

    # Top établissements par mois
    pipeline_top_etabs = [
        {"$match": {"created_at": {"$gte": debut_annee}, "etablissement_id": {"$ne": None}}},
        {"$group": {
            "_id": {"year": {"$year": "$created_at"}, "month": {"$month": "$created_at"}, "etab": "$etablissement_id"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.year": -1, "_id.month": -1, "count": -1}}
    ]
    top_etabs_results = await consultations_collection.aggregate(pipeline_top_etabs).to_list(length=None)
    etablissements_par_mois: dict[str, list[dict]] = {}
    for doc in top_etabs_results:
        key = f"{doc['_id']['year']}-{doc['_id']['month']}"
        bucket = etablissements_par_mois.setdefault(key, [])
        if len(bucket) < 5:
            etab_id = doc["_id"]["etab"]
            bucket.append({"nom": noms_etablissements.get(etab_id, "Établissement inconnu"), "consultations": doc["count"]})

    # Ordonnances par mois
    pipeline_ordonnances = [
        {"$match": {"created_at": {"$gte": debut_annee}}},
        {"$group": {
            "_id": {"year": {"$year": "$created_at"}, "month": {"$month": "$created_at"}},
            "count": {"$sum": 1}
        }},
    ]
    ordonnances_results = await ordonnances_collection.aggregate(pipeline_ordonnances).to_list(length=None)
    ordonnances_par_mois = {f"{d['_id']['year']}-{d['_id']['month']}": d["count"] for d in ordonnances_results}

    # Répartition annuelle par département et par type d'établissement
    pipeline_par_etab_annuel = [
        {"$match": {"created_at": {"$gte": debut_annee}, "etablissement_id": {"$ne": None}}},
        {"$group": {
            "_id": "$etablissement_id",
            "consultations": {"$sum": 1},
            "npi_uniques": {"$addToSet": "$npi"},
        }},
    ]
    par_etab_annuel = await consultations_collection.aggregate(pipeline_par_etab_annuel).to_list(length=None)

    departements_stats: dict[str, dict] = {}
    types_stats: dict[str, dict] = {}
    for r in par_etab_annuel:
        meta = etablissements_meta.get(r["_id"], {"nom": "Inconnu", "departement": "Non renseigné", "type": "Non renseigné"})

        dep = departements_stats.setdefault(meta["departement"], {"departement": meta["departement"], "consultations": 0, "npis": set(), "etablissements": set()})
        dep["consultations"] += r["consultations"]
        dep["npis"].update(r["npi_uniques"])
        dep["etablissements"].add(r["_id"])

        typ = types_stats.setdefault(meta["type"], {"type": meta["type"], "consultations": 0, "etablissements": set()})
        typ["consultations"] += r["consultations"]
        typ["etablissements"].add(r["_id"])

    totaux_par_departement: dict[str, dict] = {}
    totaux_par_type: dict[str, dict] = {}
    for meta in etablissements_meta.values():
        td = totaux_par_departement.setdefault(meta["departement"], {"total": 0, "actifs": 0})
        td["total"] += 1
        td["actifs"] += 1 if meta["actif"] else 0

        tt = totaux_par_type.setdefault(meta["type"], {"total": 0})
        tt["total"] += 1

    repartition_departements = sorted(
        [
            {
                "departement": v["departement"],
                "consultations": v["consultations"],
                "patients": len(v["npis"]),
                "etablissements_actifs": totaux_par_departement.get(v["departement"], {}).get("actifs", 0),
                "etablissements_total": totaux_par_departement.get(v["departement"], {}).get("total", 0),
            }
            for v in departements_stats.values()
        ],
        key=lambda x: x["consultations"], reverse=True
    )
    repartition_types = sorted(
        [
            {
                "type": v["type"],
                "consultations": v["consultations"],
                "etablissements": totaux_par_type.get(v["type"], {}).get("total", len(v["etablissements"])),
            }
            for v in types_stats.values()
        ],
        key=lambda x: x["consultations"], reverse=True
    )

    # Consultations + patients + établissements distincts par mois
    pipeline_stats_mensuelles = [
        {"$match": {"created_at": {"$gte": debut_annee}}},
        {"$group": {
            "_id": {"year": {"$year": "$created_at"}, "month": {"$month": "$created_at"}},
            "consultations": {"$sum": 1},
            "npi_uniques": {"$addToSet": "$npi"},
            "etabs_uniques": {"$addToSet": "$etablissement_id"},
        }},
        {"$sort": {"_id.year": -1, "_id.month": -1}}
    ]
    stats_results = await consultations_collection.aggregate(pipeline_stats_mensuelles).to_list(length=None)

    rapports_mensuels = []
    for s in stats_results:
        y, m = s["_id"]["year"], s["_id"]["month"]
        key = f"{y}-{m}"

        patients_mois = len(s["npi_uniques"])
        etabs_actifs_mois = len([e for e in s["etabs_uniques"] if e])

        rapports_mensuels.append({
            "mois": f"{MOIS_NOMS[m-1]} {y}",
            "consultations": s["consultations"],
            "patients": patients_mois,
            "ordonnances": ordonnances_par_mois.get(key, 0),
            "etablissements": etabs_actifs_mois,
            "tauxCouverture": round((patients_mois / total_dossiers * 100)) if total_dossiers > 0 else 0,
            "topDiagnostics": diagnostics_par_mois.get(key, []),
            "topEtablissements": etablissements_par_mois.get(key, []),
        })

    return {
        "cumul_annuel": {
            "consultations_ytd": cumul_actuel["consultations"],
            "consultations_ytd_variation": _variation_pct(cumul_actuel["consultations"], cumul_precedent["consultations"]),
            "patients_actifs": cumul_actuel["patients_actifs"],
            "patients_actifs_variation": _variation_pct(cumul_actuel["patients_actifs"], cumul_precedent["patients_actifs"]),
            "taux_couverture": taux_couverture,
            "taux_couverture_variation_pts": taux_couverture - taux_couverture_precedent,
            "etablissements_actifs": etablissements_actifs,
            "etablissements_total": etablissements_total,
            "ordonnances_emises": cumul_actuel["ordonnances"],
            "ordonnances_emises_variation": _variation_pct(cumul_actuel["ordonnances"], cumul_precedent["ordonnances"]),
            "alertes_securite": cumul_actuel["alertes"],
            "alertes_securite_variation": (cumul_actuel["alertes"] or 0) - (cumul_precedent["alertes"] or 0),
        },
        "rapports_mensuels": rapports_mensuels,
        "repartition_departements": repartition_departements,
        "repartition_types_etablissement": repartition_types,
        "annee": annee_en_cours,
        "genere_le": maintenant.isoformat() + "Z",
    }


@router.get("/rapports-mensuels")
async def get_rapports_mensuels(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """
    Indicateurs annuels et rapports groupés par mois, entièrement calculés
    depuis PostgreSQL/MongoDB (aucune donnée figée).
    """
    rapport = await _construire_rapport_annuel(db)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CONSULTATION_RAPPORTS_ANNUELS",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return rapport


@router.get("/rapports-mensuels/export/pdf")
async def exporter_rapport_pdf(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """Rapport annuel complet (cumul + détail mensuel) au format PDF."""
    rapport = await _construire_rapport_annuel(db)
    contenu_pdf = generer_pdf(rapport)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="EXPORT_RAPPORT_ANNUEL_PDF",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return Response(
        content=contenu_pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=rapport-annuel-dmpi-{rapport['annee']}.pdf"}
    )


@router.get("/rapports-mensuels/export/excel")
async def exporter_rapport_excel(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """Rapport annuel complet (cumul + détail mensuel) au format Excel (.xlsx)."""
    rapport = await _construire_rapport_annuel(db)
    contenu_excel = generer_excel(rapport)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="EXPORT_RAPPORT_ANNUEL_EXCEL",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return Response(
        content=contenu_excel,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=rapport-annuel-dmpi-{rapport['annee']}.xlsx"}
    )