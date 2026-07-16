"""
Script de seed complet pour DMPI — à exécuter via :
    docker compose exec backend python seed_complet.py

Ce script :
  1. Vide toutes les données existantes (PostgreSQL + MongoDB)
  2. Crée les établissements dans MongoDB
  3. Crée les utilisateurs dans PostgreSQL (rattachés aux établissements)
  4. Crée les dossiers médicaux, consultations et constantes dans MongoDB
"""
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from app.database_sql import AsyncSessionLocal, engine, Base
from app.models_sql import User
from app.security import hash_password
from app.database_mongo import (
    dossiers_medicaux_collection,
    consultations_collection,
    constantes_vitales_collection,
    administrations_collection,
    etablissements_collection,
    ordonnances_collection,
    rendez_vous_collection,
    prestataires_partenaires_collection,
)

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ─── 1. Données des établissements ──────────────────────────────────────────

ETABLISSEMENTS = [
    {
        "nom": "CNHU-HKM Cotonou",
        "ville": "Cotonou",
        "departement": "Littoral",
        "type": "CHU",
        "statut": "actif",
        "directeur": "Pr. Eugène ATTAKPA",
        "telephone": "+229 21-30-01-55",
        "dmpiVersion": "1.2.0",
        "adresse": "Avenue Jean-Paul II, Cotonou",
        "latitude": 6.3703,
        "longitude": 2.3912,
        "email_contact": "contact@cnhu-hkm.bj",
        "capacite_lits": 500,
        "patients": 0,
        "medecins": 0,
        "infirmiers": 0,
        "consultationsMois": 0,
        "derniereSync": utc_now(),
    },
    {
        "nom": "CHD du Borgou",
        "ville": "Parakou",
        "departement": "Borgou",
        "type": "CHD",
        "statut": "actif",
        "directeur": "Dr. Ibrahim SALIFOU",
        "telephone": "+229 23-61-00-45",
        "dmpiVersion": "1.1.5",
        "adresse": "Route de l'Hôpital, Parakou",
        "latitude": 9.3372,
        "longitude": 2.6303,
        "email_contact": "contact@chd-borgou.bj",
        "capacite_lits": 220,
        "patients": 0,
        "medecins": 0,
        "infirmiers": 0,
        "consultationsMois": 0,
        "derniereSync": utc_now(),
    },
    {
        "nom": "Centre de Santé de Commune de Natitingou",
        "ville": "Natitingou",
        "departement": "Atacora",
        "type": "CSC",
        "statut": "actif",
        "directeur": "Dr. Marie-Claire DOSSO",
        "telephone": "+229 23-82-10-55",
        "dmpiVersion": "1.0.8",
        "adresse": "Centre-ville, Natitingou",
        "latitude": 10.3042,
        "longitude": 1.3796,
        "email_contact": "contact@csc-natitingou.bj",
        "capacite_lits": 60,
        "patients": 0,
        "medecins": 0,
        "infirmiers": 0,
        "consultationsMois": 0,
        "derniereSync": utc_now(),
    },
]


# ─── 2. Données des utilisateurs ────────────────────────────────────────────

def make_users(etab_cnhu_id: str, etab_borgou_id: str) -> list[dict]:
    return [
        # Super Admin national
        {
            "email": "superadmin@dmpi.bj",
            "mot_de_passe_hash": hash_password("Admin2025!"),
            "nom": "Viou", "prenom": "Merveil",
            "role": "super_admin",
            "est_actif": True,
        },
        # Admins établissement
        {
            "email": "admin.cnhu@dmpi.bj",
            "mot_de_passe_hash": hash_password("Admin2025!"),
            "nom": "Hounsa", "prenom": "Kofi",
            "role": "admin_etablissement",
            "etablissement_id": etab_cnhu_id,
            "est_actif": True,
        },
        {
            "email": "admin.borgou@dmpi.bj",
            "mot_de_passe_hash": hash_password("Admin2025!"),
            "nom": "Boni", "prenom": "Rachelle",
            "role": "admin_etablissement",
            "etablissement_id": etab_borgou_id,
            "est_actif": True,
        },
        # Médecins
        {
            "email": "dr.kouassi@dmpi.bj",
            "mot_de_passe_hash": hash_password("Medecin2025!"),
            "nom": "Kouassi", "prenom": "Jean",
            "role": "medecin",
            "specialite": "Médecine Interne",
            "service": "Médecine Générale",
            "etablissement_id": etab_cnhu_id,
            "est_actif": True,
        },
        {
            "email": "dr.amoussou@dmpi.bj",
            "mot_de_passe_hash": hash_password("Medecin2025!"),
            "nom": "Amoussou", "prenom": "Sylvie",
            "role": "medecin",
            "specialite": "Cardiologie",
            "service": "Cardiologie",
            "etablissement_id": etab_cnhu_id,
            "est_actif": True,
        },
        {
            "email": "dr.salifou@dmpi.bj",
            "mot_de_passe_hash": hash_password("Medecin2025!"),
            "nom": "Salifou", "prenom": "Ibrahim",
            "role": "medecin",
            "specialite": "Pédiatrie",
            "service": "Pédiatrie",
            "etablissement_id": etab_borgou_id,
            "est_actif": True,
        },
        # Infirmiers
        {
            "email": "inf.mensah@dmpi.bj",
            "mot_de_passe_hash": hash_password("Infirmier2025!"),
            "nom": "Mensah", "prenom": "Aline",
            "role": "infirmier",
            "service": "Urgences",
            "etablissement_id": etab_cnhu_id,
            "est_actif": True,
        },
        {
            "email": "inf.dansou@dmpi.bj",
            "mot_de_passe_hash": hash_password("Infirmier2025!"),
            "nom": "Dansou", "prenom": "Parfait",
            "role": "infirmier",
            "service": "Cardiologie",
            "etablissement_id": etab_cnhu_id,
            "est_actif": True,
        },
        {
            "email": "inf.idrissou@dmpi.bj",
            "mot_de_passe_hash": hash_password("Infirmier2025!"),
            "nom": "Idrissou", "prenom": "Fatoumata",
            "role": "infirmier",
            "service": "Pédiatrie",
            "etablissement_id": etab_borgou_id,
            "est_actif": True,
        },
        # Patients
        {
            "email": "patient.dossou@dmpi.bj",
            "mot_de_passe_hash": hash_password("Patient2025!"),
            "nom": "Dossou", "prenom": "Koffi",
            "role": "patient",
            "npi_patient": "1001002001",
            "est_actif": True,
        },
        {
            "email": "patient.hounsa@dmpi.bj",
            "mot_de_passe_hash": hash_password("Patient2025!"),
            "nom": "Hounsa", "prenom": "Adélaïde",
            "role": "patient",
            "npi_patient": "2002003002",
            "est_actif": True,
        },
        {
            "email": "patient.boni@dmpi.bj",
            "mot_de_passe_hash": hash_password("Patient2025!"),
            "nom": "Boni", "prenom": "Théophile",
            "role": "patient",
            "npi_patient": "3003004003",
            "est_actif": True,
        },
    ]


# ─── 3. Données cliniques MongoDB ────────────────────────────────────────────

def make_dossiers(etab_cnhu_id: str, etab_borgou_id: str) -> list[dict]:
    return [
        {
            "npi": "1001002001",
            "nom": "Dossou", "prenom": "Koffi",
            "date_naissance": datetime(1985, 3, 15),
            "sexe": "M",
            "groupe_sanguin": "A+",
            "allergies": [{"substance": "Pénicilline", "severite": "Haute", "notes": "Choc anaphylactique 2015"}],
            "antecedents": ["Hypertension artérielle (2018)", "Diabète de type 2 (2020)"],
            "traitements_en_cours": [
                {"nom_medicament": "Amlodipine 5mg", "posologie": "1 cp/matin", "indication": "Hypertension"},
                {"nom_medicament": "Metformine 500mg", "posologie": "1 cp x3/jour", "indication": "Diabète"}
            ],
            "etablissement_id": etab_cnhu_id,
            "updated_at": utc_now(),
        },
        {
            "npi": "2002003002",
            "nom": "Hounsa", "prenom": "Adélaïde",
            "date_naissance": datetime(1992, 7, 22),
            "sexe": "F",
            "groupe_sanguin": "O+",
            "allergies": [],
            "antecedents": ["Asthme (2010)"],
            "traitements_en_cours": [
                {"nom_medicament": "Salbutamol spray", "posologie": "2 bouffées en cas de crise", "indication": "Asthme"}
            ],
            "etablissement_id": etab_cnhu_id,
            "updated_at": utc_now(),
        },
        {
            "npi": "3003004003",
            "nom": "Boni", "prenom": "Théophile",
            "date_naissance": datetime(2010, 11, 5),
            "sexe": "M",
            "groupe_sanguin": "B+",
            "allergies": [{"substance": "Amoxicilline", "severite": "Modérée", "notes": "Eruption cutanée"}],
            "antecedents": ["Paludisme sévère (2022)"],
            "traitements_en_cours": [],
            "etablissement_id": etab_borgou_id,
            "updated_at": utc_now(),
        },
    ]


def make_consultations(etab_cnhu_id: str, etab_borgou_id: str) -> list[dict]:
    return [
        # Patient 1 — Koffi Dossou
        {
            "npi": "1001002001",
            "etablissement_id": etab_cnhu_id,
            "motif": "Contrôle tensionnel et glycémique",
            "diagnostic_cim10": "I10 - Hypertension artérielle essentielle",
            "conclusion": "Pression artérielle stable sous traitement. Glycémie à jeun dans la norme.",
            "releve_par": "dr.kouassi@dmpi.bj",
            "created_at": utc_now() - timedelta(days=10),
        },
        {
            "npi": "1001002001",
            "etablissement_id": etab_cnhu_id,
            "motif": "Fièvre et douleurs articulaires depuis 4 jours",
            "diagnostic_cim10": "A90 - Dengue",
            "conclusion": "Suspicion dengue. Prise de paracétamol, repos et hydratation. Contrôle dans 48h.",
            "releve_par": "dr.amoussou@dmpi.bj",
            "created_at": utc_now() - timedelta(days=3),
        },
        # Patient 2 — Adélaïde Hounsa
        {
            "npi": "2002003002",
            "etablissement_id": etab_cnhu_id,
            "motif": "Crise d'asthme modérée",
            "diagnostic_cim10": "J45.1 - Asthme à prédominance allergique persistant léger",
            "conclusion": "Crise contrôlée avec salbutamol. Éducation thérapeutique réalisée.",
            "releve_par": "dr.amoussou@dmpi.bj",
            "created_at": utc_now() - timedelta(days=7),
        },
        # Patient 3 — Théophile Boni
        {
            "npi": "3003004003",
            "etablissement_id": etab_borgou_id,
            "motif": "Fièvre élevée et vomissements",
            "diagnostic_cim10": "B54 - Paludisme, sans précision",
            "conclusion": "Paludisme confirmé par TDR. Traitement antipaludéen initié.",
            "releve_par": "dr.salifou@dmpi.bj",
            "created_at": utc_now() - timedelta(days=14),
        },
        {
            "npi": "3003004003",
            "etablissement_id": etab_borgou_id,
            "motif": "Consultation de suivi post-paludisme",
            "diagnostic_cim10": "B54 - Paludisme, sans précision",
            "conclusion": "Guérison complète confirmée. Aucun signe résiduel.",
            "releve_par": "dr.salifou@dmpi.bj",
            "created_at": utc_now() - timedelta(days=7),
        },
    ]


def make_ordonnances(consult_ids: list[str]) -> list[dict]:
    """
    Aligné sur app.schemas.ordonnance.OrdonnanceMongo et inséré dans
    ordonnances_collection (collection top-level lue par /ordonnances,
    distincte des consultations).
    """
    return [
        {
            "npi": "1001002001",
            "consultation_id": consult_ids[0],
            "traitements": [{"nom_medicament": "Amlodipine 5mg", "posologie": "1cp/matin", "duree": "30j"}],
            "notes_additionnelles": None,
            "auteur": "dr.kouassi@dmpi.bj",
            "created_at": utc_now() - timedelta(days=10),
        },
        {
            "npi": "1001002001",
            "consultation_id": consult_ids[1],
            "traitements": [{"nom_medicament": "Paracétamol 1000mg", "posologie": "1cp/8h", "duree": "5j"}],
            "notes_additionnelles": "Repos et hydratation.",
            "auteur": "dr.amoussou@dmpi.bj",
            "created_at": utc_now() - timedelta(days=3),
        },
        {
            "npi": "2002003002",
            "consultation_id": consult_ids[2],
            "traitements": [{"nom_medicament": "Salbutamol spray", "posologie": "2 bouffées/crise", "duree": "PRN"}],
            "notes_additionnelles": "Éducation thérapeutique réalisée.",
            "auteur": "dr.amoussou@dmpi.bj",
            "created_at": utc_now() - timedelta(days=7),
        },
        {
            "npi": "3003004003",
            "consultation_id": consult_ids[3],
            "traitements": [{"nom_medicament": "Artéméther-Luméfantrine", "posologie": "4cp x2/j", "duree": "3j"}],
            "notes_additionnelles": None,
            "auteur": "dr.salifou@dmpi.bj",
            "created_at": utc_now() - timedelta(days=14),
        },
    ]


def make_rdv() -> list[dict]:
    """Aligné sur app.routes.rdv.RendezVousCreate / la collection rendez_vous."""
    return [
        {
            "npi_patient": "1001002001",
            "nom_patient": "Dossou",
            "prenom_patient": "Koffi",
            "date_rdv": (utc_now() + timedelta(days=20)).isoformat(),
            "motif": "Contrôle trimestriel hypertension et diabète",
            "notes": "Apporter carnet de surveillance glycémique.",
            "medecin_email": "dr.kouassi@dmpi.bj",
            "medecin_nom": "Dr. Jean Kouassi",
            "statut": "confirme",
            "created_at": utc_now().isoformat(),
        },
        {
            "npi_patient": "2002003002",
            "nom_patient": "Hounsa",
            "prenom_patient": "Adélaïde",
            "date_rdv": (utc_now() + timedelta(days=45)).isoformat(),
            "motif": "Suivi asthme - contrôle fonction respiratoire",
            "notes": None,
            "medecin_email": "dr.amoussou@dmpi.bj",
            "medecin_nom": "Dr. Sylvie Amoussou",
            "statut": "confirme",
            "created_at": utc_now().isoformat(),
        },
    ]


def make_prestataires() -> list[dict]:
    """Pharmacies partenaires de démonstration, positionnées autour des trois
    établissements du seed pour que le calcul de distance donne des résultats
    réalistes (feature 'orientation vers pharmacie la plus proche')."""
    return [
        {
            "nom": "Pharmacie Jonquet",
            "types": ["pharmacie"],
            "departement": "Littoral", "commune": "Cotonou", "arrondissement": None, "quartier": "Jonquet",
            "adresse": "Rue du Gouverneur Bayol, Cotonou",
            "latitude": 6.3625, "longitude": 2.4005,
            "telephone": "+229 21-31-45-12", "email": None,
            "horaires": "Lun-Sam 8h-20h, dimanche fermé",
            "etablissement_rattachement_id": None,
            "statut": "actif", "source_donnees": "saisi_super_admin",
            "derniere_verification": utc_now() - timedelta(days=5),
            "created_at": utc_now(), "updated_at": utc_now(),
        },
        {
            "nom": "Pharmacie du Phare",
            "types": ["pharmacie"],
            "departement": "Littoral", "commune": "Cotonou", "arrondissement": None, "quartier": "Le Phare",
            "adresse": "Boulevard Saint-Michel, Cotonou",
            "latitude": 6.3550, "longitude": 2.4300,
            "telephone": "+229 21-30-88-40", "email": None,
            "horaires": "Ouverte 24h/24",
            "etablissement_rattachement_id": None,
            "statut": "actif", "source_donnees": "saisi_super_admin",
            "derniere_verification": utc_now() - timedelta(days=20),
            "created_at": utc_now(), "updated_at": utc_now(),
        },
        {
            "nom": "Pharmacie Centrale de Parakou",
            "types": ["pharmacie"],
            "departement": "Borgou", "commune": "Parakou", "arrondissement": None, "quartier": "Centre-ville",
            "adresse": "Avenue de la Gare, Parakou",
            "latitude": 9.3410, "longitude": 2.6280,
            "telephone": "+229 23-61-14-02", "email": None,
            "horaires": "Lun-Sam 8h-19h30",
            "etablissement_rattachement_id": None,
            "statut": "actif", "source_donnees": "saisi_super_admin",
            "derniere_verification": utc_now() - timedelta(days=2),
            "created_at": utc_now(), "updated_at": utc_now(),
        },
        {
            "nom": "Pharmacie de l'Atacora",
            "types": ["pharmacie"],
            "departement": "Atacora", "commune": "Natitingou", "arrondissement": None, "quartier": "Centre-ville",
            "adresse": "Route Nationale, Natitingou",
            "latitude": 10.3100, "longitude": 1.3830,
            "telephone": "+229 23-82-05-77", "email": None,
            "horaires": "Lun-Sam 8h-19h",
            "etablissement_rattachement_id": None,
            "statut": "actif", "source_donnees": "saisi_super_admin",
            "derniere_verification": utc_now() - timedelta(days=45),
            "created_at": utc_now(), "updated_at": utc_now(),
        },
    ]


def make_constantes(etab_cnhu_id: str) -> list[dict]:
    return [
        {"npi": "1001002001", "tension_arterielle": "130/85", "pouls": 72, "temperature": 36.8, "saturation_oxygene": 98,
         "notes": "Patient calme, légère fatigue signalée.", "releve_par": "inf.mensah@dmpi.bj",
         "etablissement_id": etab_cnhu_id, "created_at": utc_now() - timedelta(days=10)},
        {"npi": "1001002001", "tension_arterielle": "145/92", "pouls": 88, "temperature": 38.9, "saturation_oxygene": 97,
         "notes": "Fièvre modérée, patient algique.", "releve_par": "inf.mensah@dmpi.bj",
         "etablissement_id": etab_cnhu_id, "created_at": utc_now() - timedelta(days=3)},
        {"npi": "2002003002", "tension_arterielle": "110/70", "pouls": 95, "temperature": 37.2, "saturation_oxygene": 93,
         "notes": "SpO2 basse à l'arrivée. Bronchospasme audible.", "releve_par": "inf.dansou@dmpi.bj",
         "etablissement_id": etab_cnhu_id, "created_at": utc_now() - timedelta(days=7)},
    ]


# ─── Main ────────────────────────────────────────────────────────────────────

async def reset_et_seed():
    print("=" * 60)
    print("  DMPI — Script de seed complet")
    print("=" * 60)

    # 1. Vider PostgreSQL
    print("\n[1/7] Vidage de PostgreSQL...")
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM delegations_acces"))
        await db.execute(text("DELETE FROM demandes_acces_patient"))
        await db.execute(text("DELETE FROM audit_logs"))
        await db.execute(text("DELETE FROM users"))
        await db.commit()
    async with engine.begin() as conn:
        await conn.execute(text("ALTER SEQUENCE users_id_seq RESTART WITH 1"))
        await conn.execute(text("ALTER SEQUENCE demandes_acces_patient_id_seq RESTART WITH 1"))
        await conn.execute(text("ALTER SEQUENCE audit_logs_id_seq RESTART WITH 1"))
        await conn.execute(text("ALTER SEQUENCE delegations_acces_id_seq RESTART WITH 1"))
    print("    ✓ Tables PostgreSQL vidées et séquences réinitialisées.")

    # 2. Vider MongoDB
    print("\n[2/7] Vidage de MongoDB...")
    await dossiers_medicaux_collection.delete_many({})
    await consultations_collection.delete_many({})
    await constantes_vitales_collection.delete_many({})
    await administrations_collection.delete_many({})
    await etablissements_collection.delete_many({})
    await ordonnances_collection.delete_many({})
    await rendez_vous_collection.delete_many({})
    await prestataires_partenaires_collection.delete_many({})
    print("    ✓ Collections MongoDB vidées.")

    # 3. Créer les établissements
    print("\n[3/7] Création des établissements...")
    etab_docs = ETABLISSEMENTS
    result = await etablissements_collection.insert_many(etab_docs)
    etab_ids = [str(oid) for oid in result.inserted_ids]
    etab_cnhu_id = etab_ids[0]
    etab_borgou_id = etab_ids[1]
    etab_natitingou_id = etab_ids[2]
    print(f"    ✓ CNHU-HKM  id={etab_cnhu_id}")
    print(f"    ✓ CHD Borgou id={etab_borgou_id}")
    print(f"    ✓ CSC Natitingou id={etab_natitingou_id}")

    # 4. Créer les utilisateurs
    print("\n[4/7] Création des utilisateurs PostgreSQL...")
    users_data = make_users(etab_cnhu_id, etab_borgou_id)
    async with AsyncSessionLocal() as db:
        for u in users_data:
            db.add(User(**u))
        await db.commit()
    print(f"    ✓ {len(users_data)} utilisateurs créés.")

    # 5. Créer les dossiers, consultations et constantes MongoDB
    print("\n[5/7] Insertion des données cliniques MongoDB...")
    dossiers = make_dossiers(etab_cnhu_id, etab_borgou_id)
    await dossiers_medicaux_collection.insert_many(dossiers)
    print(f"    ✓ {len(dossiers)} dossiers médicaux insérés.")

    consultations = make_consultations(etab_cnhu_id, etab_borgou_id)
    consult_result = await consultations_collection.insert_many(consultations)
    consult_ids = [str(oid) for oid in consult_result.inserted_ids]
    print(f"    ✓ {len(consultations)} consultations insérées.")

    constantes = make_constantes(etab_cnhu_id)
    await constantes_vitales_collection.insert_many(constantes)
    print(f"    ✓ {len(constantes)} constantes vitales insérées.")

    # 6. Créer les ordonnances et rendez-vous MongoDB
    print("\n[6/7] Insertion des ordonnances et rendez-vous MongoDB...")
    ordonnances = make_ordonnances(consult_ids)
    await ordonnances_collection.insert_many(ordonnances)
    print(f"    ✓ {len(ordonnances)} ordonnances insérées.")

    rdvs = make_rdv()
    await rendez_vous_collection.insert_many(rdvs)
    print(f"    ✓ {len(rdvs)} rendez-vous planifiés.")

    print("\n[7/7] Insertion des prestataires partenaires (pharmacies)...")
    prestataires = make_prestataires()
    await prestataires_partenaires_collection.insert_many(prestataires)
    print(f"    ✓ {len(prestataires)} prestataires partenaires insérés.")

    print("\n" + "=" * 60)
    print("  Seed terminé avec succès !")
    print("=" * 60)
    print("\n  Comptes de connexion :")
    print("  ┌─ Super Admin  : superadmin@dmpi.bj       / Admin2025!")
    print("  ├─ Médecin      : dr.kouassi@dmpi.bj       / Medecin2025!")
    print("  ├─ Infirmier    : inf.mensah@dmpi.bj       / Infirmier2025!")
    print("  └─ Patient      : patient.dossou@dmpi.bj   / Patient2025!")


if __name__ == "__main__":
    asyncio.run(reset_et_seed())
