"""
Script de seed complet pour DMPI — à exécuter via :
    docker compose exec backend python seed_complet.py

Ce script :
  1. Vide toutes les données existantes (PostgreSQL + MongoDB)
  2. Crée les établissements dans MongoDB
  3. Crée les utilisateurs dans PostgreSQL (rattachés aux établissements)
  4. Crée les dossiers médicaux, consultations et constantes dans MongoDB
  5. Crée des files d'attente, demandes d'accès et délégations de démonstration
  6. Dépose deux documents médicaux réels (fichiers écrits sur le volume
     `uploads`, pas de simples entrées MongoDB sans fichier derrière)
"""
import asyncio
import io
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from starlette.datastructures import UploadFile
from PIL import Image, ImageDraw
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm

from app.database_sql import AsyncSessionLocal, engine, Base
from app.models_sql import User, DemandeAccesPatient, DelegationAcces
from app.security import hash_password
from app.stockage_fichiers import sauvegarder_fichier
from app.database_mongo import (
    dossiers_medicaux_collection,
    consultations_collection,
    constantes_vitales_collection,
    administrations_collection,
    etablissements_collection,
    ordonnances_collection,
    rendez_vous_collection,
    prestataires_partenaires_collection,
    demandes_examen_collection,
    documents_medicaux_collection,
    file_attente_collection,
)

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ─── 1. Données des établissements ──────────────────────────────────────────

ETABLISSEMENTS = [
    {
        "nom": "CNHU-HKM Cotonou",
        "commune": "Cotonou",
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
        "commune": "Parakou",
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
        "commune": "Natitingou",
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
    {
        "nom": "Clinique Louis Pasteur",
        "commune": "Cotonou",
        "departement": "Littoral",
        "type": "Clinique",
        "statut": "actif",
        "directeur": "Dr. Serge TCHIBOZO",
        "telephone": "+229 21-33-45-90",
        "dmpiVersion": "1.0.2",
        "adresse": "Rue 145, Fidjrossè, Cotonou",
        "latitude": 6.3600,
        "longitude": 2.3700,
        "email_contact": "contact@clinique-pasteur.bj",
        "capacite_lits": 40,
        "patients": 0,
        "medecins": 0,
        "infirmiers": 0,
        "consultationsMois": 0,
        "derniereSync": utc_now(),
    },
]


# ─── 2. Données des utilisateurs ────────────────────────────────────────────

def make_users(
    etab_cnhu_id: str,
    etab_borgou_id: str,
    etab_natitingou_id: str,
    etab_clinique_id: str,
    labo_cotonou_id: str,
    labo_parakou_id: str,
) -> list[dict]:
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
        {
            "email": "admin.natitingou@dmpi.bj",
            "mot_de_passe_hash": hash_password("Admin2025!"),
            "nom": "Dagnon", "prenom": "Clarisse",
            "role": "admin_etablissement",
            "etablissement_id": etab_natitingou_id,
            "est_actif": True,
        },
        {
            "email": "admin.pasteur@dmpi.bj",
            "mot_de_passe_hash": hash_password("Admin2025!"),
            "nom": "Tchibozo", "prenom": "Serge",
            "role": "admin_etablissement",
            "etablissement_id": etab_clinique_id,
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
        {
            "email": "dr.tchabi@dmpi.bj",
            "mot_de_passe_hash": hash_password("Medecin2025!"),
            "nom": "Tchabi", "prenom": "Moussa",
            "role": "medecin",
            "specialite": "Médecine Générale",
            "service": "Médecine Générale",
            "etablissement_id": etab_natitingou_id,
            "est_actif": True,
        },
        {
            "email": "dr.aguemon@dmpi.bj",
            "mot_de_passe_hash": hash_password("Medecin2025!"),
            "nom": "Aguemon", "prenom": "Nadège",
            "role": "medecin",
            "specialite": "Gynécologie",
            "service": "Gynécologie-Obstétrique",
            "etablissement_id": etab_clinique_id,
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
        {
            "email": "inf.gnonlonfoun@dmpi.bj",
            "mot_de_passe_hash": hash_password("Infirmier2025!"),
            "nom": "Gnonlonfoun", "prenom": "Justine",
            "role": "infirmier",
            "service": "Médecine Générale",
            "etablissement_id": etab_natitingou_id,
            "est_actif": True,
        },
        {
            "email": "inf.sossou@dmpi.bj",
            "mot_de_passe_hash": hash_password("Infirmier2025!"),
            "nom": "Sossou", "prenom": "Prisca",
            "role": "infirmier",
            "service": "Gynécologie-Obstétrique",
            "etablissement_id": etab_clinique_id,
            "est_actif": True,
        },
        # Laboratoires partenaires
        {
            "email": "labo.bioanalyses@dmpi.bj",
            "mot_de_passe_hash": hash_password("Labo2025!"),
            "prenom": "Laboratoire Bio-Analyses Cotonou", "nom": "Cotonou",
            "role": "laboratoire",
            "prestataire_id": labo_cotonou_id,
            "est_actif": True,
        },
        {
            "email": "labo.national@dmpi.bj",
            "mot_de_passe_hash": hash_password("Labo2025!"),
            "prenom": "Laboratoire National de Référence", "nom": "Parakou",
            "role": "laboratoire",
            "prestataire_id": labo_parakou_id,
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
        {
            "email": "patient.yacoubou@dmpi.bj",
            "mot_de_passe_hash": hash_password("Patient2025!"),
            "nom": "Yacoubou", "prenom": "Odile",
            "role": "patient",
            "npi_patient": "4004005004",
            "est_actif": True,
        },
        {
            "email": "patient.agbo@dmpi.bj",
            "mot_de_passe_hash": hash_password("Patient2025!"),
            "nom": "Agbo", "prenom": "Bertrand",
            "role": "patient",
            "npi_patient": "5005006005",
            "est_actif": True,
        },
        {
            "email": "patient.chabi@dmpi.bj",
            "mot_de_passe_hash": hash_password("Patient2025!"),
            "nom": "Chabi", "prenom": "Rasidatou",
            "role": "patient",
            "npi_patient": "6006007006",
            "est_actif": True,
        },
    ]


# ─── 3. Données cliniques MongoDB ────────────────────────────────────────────

def make_dossiers(etab_cnhu_id: str, etab_borgou_id: str, etab_natitingou_id: str, etab_clinique_id: str) -> list[dict]:
    return [
        {
            "npi": "1001002001",
            "nom": "Dossou", "prenom": "Koffi",
            "date_naissance": datetime(1985, 3, 15),
            "sexe": "M",
            "groupe_sanguin": "A+",
            "allergies": [{"substance": "Pénicilline", "severite": "anaphylaxie", "notes": "Choc anaphylactique 2015"}],
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
            "allergies": [{"substance": "Amoxicilline", "severite": "moderee", "notes": "Eruption cutanée"}],
            "antecedents": ["Paludisme sévère (2022)"],
            "traitements_en_cours": [],
            "etablissement_id": etab_borgou_id,
            "updated_at": utc_now(),
        },
        {
            "npi": "4004005004",
            "nom": "Yacoubou", "prenom": "Odile",
            "date_naissance": datetime(1998, 4, 12),
            "sexe": "F",
            "groupe_sanguin": "O-",
            "allergies": [],
            "antecedents": ["Grossesse gémellaire suivie (2023)"],
            "traitements_en_cours": [],
            "etablissement_id": etab_natitingou_id,
            "updated_at": utc_now(),
        },
        {
            "npi": "5005006005",
            "nom": "Agbo", "prenom": "Bertrand",
            "date_naissance": datetime(1975, 9, 30),
            "sexe": "M",
            "groupe_sanguin": "B-",
            "allergies": [{"substance": "Iode (produit de contraste)", "severite": "moderee", "notes": "Urticaire lors d'un scanner injecté"}],
            "antecedents": ["Lithiase rénale (2019)"],
            "traitements_en_cours": [],
            "etablissement_id": etab_clinique_id,
            "updated_at": utc_now(),
        },
        {
            "npi": "6006007006",
            "nom": "Chabi", "prenom": "Rasidatou",
            "date_naissance": datetime(2005, 1, 18),
            "sexe": "F",
            "groupe_sanguin": "A+",
            "allergies": [],
            "antecedents": ["Anémie falciforme (SS) suivie depuis l'enfance"],
            "traitements_en_cours": [
                {"nom_medicament": "Acide folique 5mg", "posologie": "1 cp/jour", "indication": "Anémie falciforme"}
            ],
            "etablissement_id": etab_borgou_id,
            "updated_at": utc_now(),
        },
    ]


def make_consultations(etab_cnhu_id: str, etab_borgou_id: str, etab_natitingou_id: str, etab_clinique_id: str) -> list[dict]:
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
        # Patient 4 — Odile Yacoubou
        {
            "npi": "4004005004",
            "etablissement_id": etab_natitingou_id,
            "motif": "Contrôle prénatal - 28 semaines",
            "diagnostic_cim10": "Z34 - Surveillance d'une grossesse normale",
            "conclusion": "Grossesse évolutive normale. Rendez-vous mensuel programmé.",
            "releve_par": "dr.tchabi@dmpi.bj",
            "created_at": utc_now() - timedelta(days=5),
        },
        # Patient 5 — Bertrand Agbo
        {
            "npi": "5005006005",
            "etablissement_id": etab_clinique_id,
            "motif": "Douleur lombaire droite intense",
            "diagnostic_cim10": "N20 - Calcul du rein et de l'uretère",
            "conclusion": "Colique néphrétique confirmée à l'échographie. Traitement antalgique prescrit.",
            "releve_par": "dr.aguemon@dmpi.bj",
            "created_at": utc_now() - timedelta(days=2),
        },
        # Patient 6 — Rasidatou Chabi
        {
            "npi": "6006007006",
            "etablissement_id": etab_borgou_id,
            "motif": "Crise vaso-occlusive - douleurs osseuses",
            "diagnostic_cim10": "D57.0 - Anémie à hématies falciformes avec crise",
            "conclusion": "Crise vaso-occlusive modérée. Hydratation et antalgiques administrés. Amélioration.",
            "releve_par": "dr.salifou@dmpi.bj",
            "created_at": utc_now() - timedelta(days=1),
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
        {
            "npi": "5005006005",
            "consultation_id": consult_ids[6],
            "traitements": [{"nom_medicament": "Tamsulosine 0.4mg", "posologie": "1cp/soir", "duree": "10j"}],
            "notes_additionnelles": "Favorise l'élimination spontanée du calcul.",
            "auteur": "dr.aguemon@dmpi.bj",
            "created_at": utc_now() - timedelta(days=2),
        },
        {
            "npi": "6006007006",
            "consultation_id": consult_ids[7],
            "traitements": [{"nom_medicament": "Acide folique 5mg", "posologie": "1cp/jour", "duree": "90j"}],
            "notes_additionnelles": "Traitement de fond de l'anémie falciforme, à renouveler.",
            "auteur": "dr.salifou@dmpi.bj",
            "created_at": utc_now() - timedelta(days=1),
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
        {
            "npi_patient": "6006007006",
            "nom_patient": "Chabi",
            "prenom_patient": "Rasidatou",
            "date_rdv": (utc_now() + timedelta(days=30)).isoformat(),
            "motif": "Suivi hématologique - contrôle NFS",
            "notes": None,
            "medecin_email": "dr.salifou@dmpi.bj",
            "medecin_nom": "Dr. Ibrahim Salifou",
            "statut": "confirme",
            "created_at": utc_now().isoformat(),
        },
    ]


def make_prestataires() -> list[dict]:
    """Pharmacies et laboratoires partenaires de démonstration, positionnés
    autour des établissements du seed pour que le calcul de distance donne
    des résultats réalistes (feature 'orientation vers pharmacie la plus
    proche') et pour offrir un choix entre deux laboratoires lors de la
    prescription d'un examen."""
    return [
        {
            "nom": "Pharmacie Jonquet",
            "type": "pharmacie",
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
            "type": "pharmacie",
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
            "type": "pharmacie",
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
            "type": "pharmacie",
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
        {
            "nom": "Laboratoire Bio-Analyses Cotonou",
            "type": "laboratoire",
            "departement": "Littoral", "commune": "Cotonou", "arrondissement": None, "quartier": "Akpakpa",
            "adresse": "Carrefour Akpakpa, Cotonou",
            "latitude": 6.3667, "longitude": 2.4472,
            "telephone": "+229 21-33-20-08", "email": "contact@bioanalyses-cotonou.bj",
            "horaires": "Lun-Sam 7h-18h",
            "etablissement_rattachement_id": None,
            "statut": "actif", "source_donnees": "saisi_super_admin",
            "derniere_verification": utc_now() - timedelta(days=1),
            "created_at": utc_now(), "updated_at": utc_now(),
        },
        {
            "nom": "Laboratoire National de Référence",
            "type": "laboratoire",
            "departement": "Borgou", "commune": "Parakou", "arrondissement": None, "quartier": "Centre-ville",
            "adresse": "Avenue Bio Guerra, Parakou",
            "latitude": 9.3395, "longitude": 2.6255,
            "telephone": "+229 23-61-22-90", "email": "contact@labo-national.bj",
            "horaires": "Lun-Ven 7h30-17h",
            "etablissement_rattachement_id": None,
            "statut": "actif", "source_donnees": "saisi_super_admin",
            "derniere_verification": utc_now() - timedelta(days=3),
            "created_at": utc_now(), "updated_at": utc_now(),
        },
    ]


def make_constantes(etab_cnhu_id: str, etab_borgou_id: str, etab_natitingou_id: str, etab_clinique_id: str) -> list[dict]:
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
        {"npi": "4004005004", "tension_arterielle": "118/75", "pouls": 82, "temperature": 36.9, "saturation_oxygene": 99,
         "notes": "Grossesse bien tolérée, aucun œdème constaté.", "releve_par": "inf.gnonlonfoun@dmpi.bj",
         "etablissement_id": etab_natitingou_id, "created_at": utc_now() - timedelta(days=5)},
        {"npi": "5005006005", "tension_arterielle": "128/82", "pouls": 90, "temperature": 37.4, "saturation_oxygene": 98,
         "notes": "Patient algique, position antalgique.", "releve_par": "inf.sossou@dmpi.bj",
         "etablissement_id": etab_clinique_id, "created_at": utc_now() - timedelta(days=2)},
        {"npi": "6006007006", "tension_arterielle": "105/68", "pouls": 110, "temperature": 37.8, "saturation_oxygene": 95,
         "notes": "Douleurs osseuses diffuses, faciès algique.", "releve_par": "inf.idrissou@dmpi.bj",
         "etablissement_id": etab_borgou_id, "created_at": utc_now() - timedelta(days=1)},
    ]


def make_file_attente(etab_cnhu_id: str, etab_borgou_id: str, etab_natitingou_id: str) -> list[dict]:
    """File d'attente de triage infirmier — un cas par statut du cycle
    (en_attente → assigne → en_consultation) pour que la page infirmier et
    le badge de la sidebar aient tout de suite un contenu réaliste."""
    return [
        {
            "npi": "1001002001", "nom": "Dossou", "prenom": "Koffi",
            "etablissement_id": etab_cnhu_id,
            "infirmier_email": "inf.mensah@dmpi.bj",
            "medecin_email": None,
            "motif_bref": "Douleur thoracique",
            "priorite": "urgente",
            "statut": "en_attente",
            "date_creation": utc_now() - timedelta(minutes=20),
            "date_assignation": None,
            "date_prise_en_charge": None,
            "date_fin": None,
        },
        {
            "npi": "2002003002", "nom": "Hounsa", "prenom": "Adélaïde",
            "etablissement_id": etab_cnhu_id,
            "infirmier_email": "inf.dansou@dmpi.bj",
            "medecin_email": "dr.amoussou@dmpi.bj",
            "motif_bref": "Suivi asthme",
            "priorite": "normale",
            "statut": "assigne",
            "date_creation": utc_now() - timedelta(hours=1),
            "date_assignation": utc_now() - timedelta(minutes=40),
            "date_prise_en_charge": None,
            "date_fin": None,
        },
        {
            "npi": "6006007006", "nom": "Chabi", "prenom": "Rasidatou",
            "etablissement_id": etab_borgou_id,
            "infirmier_email": "inf.idrissou@dmpi.bj",
            "medecin_email": "dr.salifou@dmpi.bj",
            "motif_bref": "Crise vaso-occlusive - douleurs osseuses",
            "priorite": "urgente",
            "statut": "en_consultation",
            "date_creation": utc_now() - timedelta(hours=2),
            "date_assignation": utc_now() - timedelta(hours=1, minutes=30),
            "date_prise_en_charge": utc_now() - timedelta(hours=1),
            "date_fin": None,
        },
        {
            "npi": "4004005004", "nom": "Yacoubou", "prenom": "Odile",
            "etablissement_id": etab_natitingou_id,
            "infirmier_email": "inf.gnonlonfoun@dmpi.bj",
            "medecin_email": None,
            "motif_bref": "Contrôle prénatal",
            "priorite": "normale",
            "statut": "en_attente",
            "date_creation": utc_now() - timedelta(minutes=10),
            "date_assignation": None,
            "date_prise_en_charge": None,
            "date_fin": None,
        },
    ]


def make_demandes_acces(etab_natitingou_id: str, etab_clinique_id: str, etab_borgou_id: str) -> list[dict]:
    """Demandes d'ouverture de compte portail patient, une par statut
    (en_attente / traite / rejete) pour peupler la file de traitement du
    Super Admin et de l'admin d'établissement."""
    return [
        {
            "npi": "5005006005", "nom": "Agbo", "prenom": "Bertrand",
            "telephone_contact": "+229 97-00-11-22",
            "demandeur_email": "dr.aguemon@dmpi.bj",
            "etablissement_id": etab_clinique_id,
            "statut": "en_attente",
            "motif_rejet": None,
            "date_creation": utc_now() - timedelta(days=1),
        },
        {
            "npi": "4004005004", "nom": "Yacoubou", "prenom": "Odile",
            "telephone_contact": "+229 96-00-33-44",
            "demandeur_email": "dr.tchabi@dmpi.bj",
            "etablissement_id": etab_natitingou_id,
            "statut": "traite",
            "motif_rejet": None,
            "date_creation": utc_now() - timedelta(days=6),
        },
        {
            "npi": "6006007006", "nom": "Chabi", "prenom": "Rasidatou",
            "telephone_contact": "+229 90-00-55-66",
            "demandeur_email": "inf.idrissou@dmpi.bj",
            "etablissement_id": etab_borgou_id,
            "statut": "rejete",
            "motif_rejet": "Numéro de téléphone invalide, à corriger avant nouvelle soumission.",
            "date_creation": utc_now() - timedelta(days=3),
        },
    ]


def make_delegations() -> list[dict]:
    """Une délégation active (congé en cours) et une expirée, pour que la
    page de délégation entre confrères ne soit pas vide au premier lancement."""
    return [
        {
            "delegant_email": "dr.kouassi@dmpi.bj",
            "beneficiaire_email": "dr.amoussou@dmpi.bj",
            "npi_patient": "1001002001",
            "motif": "Congés annuels - suivi HTA/diabète à assurer en mon absence",
            "date_debut": utc_now() - timedelta(days=5),
            "date_fin": utc_now() + timedelta(days=10),
            "active": True,
        },
        {
            "delegant_email": "dr.amoussou@dmpi.bj",
            "beneficiaire_email": "dr.kouassi@dmpi.bj",
            "npi_patient": "2002003002",
            "motif": "Formation à Cotonou",
            "date_debut": utc_now() - timedelta(days=30),
            "date_fin": utc_now() - timedelta(days=20),
            "active": False,
        },
    ]


# ─── 4. Documents médicaux réels (fichiers écrits sur le volume `uploads`) ──

def _generer_pdf_resultat(titre: str, lignes: list[str]) -> bytes:
    """Génère un vrai PDF (via reportlab, déjà utilisé pour l'export des
    rapports) plutôt que de simuler un document sans fichier derrière —
    le bouton « Télécharger » doit fonctionner même sur les données de seed."""
    buffer = io.BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=A4)
    largeur, hauteur = A4
    c.setFont("Helvetica-Bold", 14)
    c.drawString(2 * cm, hauteur - 3 * cm, titre)
    c.setFont("Helvetica", 11)
    y = hauteur - 4.5 * cm
    for ligne in lignes:
        c.drawString(2 * cm, y, ligne)
        y -= 0.8 * cm
    c.showPage()
    c.save()
    return buffer.getvalue()


def _generer_image_resultat(texte: str) -> bytes:
    image = Image.new("RGB", (900, 700), color=(24, 28, 36))
    dessin = ImageDraw.Draw(image)
    dessin.rectangle([25, 25, 875, 675], outline=(210, 214, 222), width=4)
    dessin.text((50, 330), texte, fill=(232, 234, 240))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


async def _sauvegarder_depuis_bytes(contenu: bytes, nom_fichier: str) -> dict:
    upload = UploadFile(io.BytesIO(contenu), filename=nom_fichier)
    return await sauvegarder_fichier(upload)


async def seed_examens_et_documents(labo_cotonou_id: str, labo_parakou_id: str) -> None:
    # Demande en attente — dépôt à faire manuellement pendant la démo,
    # pour que la file du laboratoire ne soit pas vide au premier lancement.
    demande_en_attente = {
        "npi": "1001002001",
        "prestataire_id": labo_cotonou_id,
        "type_examen": "Numération formule sanguine (NFS)",
        "motif": "Suspicion dengue — recherche de thrombopénie",
        "medecin_email": "dr.amoussou@dmpi.bj",
        "statut": "en_attente",
        "created_at": utc_now() - timedelta(days=2),
    }
    await demandes_examen_collection.insert_one(demande_en_attente)

    demande_en_attente_2 = {
        "npi": "5005006005",
        "prestataire_id": labo_parakou_id,
        "type_examen": "Créatininémie",
        "motif": "Bilan rénal suite colique néphrétique",
        "medecin_email": "dr.aguemon@dmpi.bj",
        "statut": "en_attente",
        "created_at": utc_now() - timedelta(hours=6),
    }
    await demandes_examen_collection.insert_one(demande_en_attente_2)

    # Demande déjà traitée, avec un vrai résultat déposé par le laboratoire
    # (fichier PNG réel sur le disque) et une interprétation du médecin —
    # démontre le parcours complet dépôt labo + interprétation médecin.
    demande_traitee = {
        "npi": "2002003002",
        "prestataire_id": labo_cotonou_id,
        "type_examen": "Radiographie thoracique",
        "motif": "Bilan de crise d'asthme récidivante",
        "medecin_email": "dr.amoussou@dmpi.bj",
        "statut": "traitee",
        "created_at": utc_now() - timedelta(days=6),
    }
    result_demande = await demandes_examen_collection.insert_one(demande_traitee)
    demande_id = str(result_demande.inserted_id)

    image_radio = _generer_image_resultat("Radiographie thoracique — démonstration DMPI")
    fichier_radio = await _sauvegarder_depuis_bytes(image_radio, "radiographie_thoracique.png")
    doc_labo = {
        "npi": "2002003002",
        "demande_examen_id": demande_id,
        "type": "radiographie",
        "libelle": "Radiographie thoracique de face",
        "date_realisation": utc_now() - timedelta(days=5),
        "laboratoire_nom": "Laboratoire Bio-Analyses Cotonou",
        "prestataire_id": labo_cotonou_id,
        "uploade_par_email": "labo.bioanalyses@dmpi.bj",
        "uploade_par_role": "laboratoire",
        "commentaire": "Cliché réalisé en inspiration profonde, bonne qualité technique.",
        "interpretation_medecin": "Pas de foyer infectieux ni d'épanchement visible. Silhouette cardiaque normale. Aspect compatible avec un asthme bien contrôlé.",
        "interpretation_par_email": "dr.amoussou@dmpi.bj",
        "fichiers": [fichier_radio],
        "statut": "disponible",
        "created_at": utc_now() - timedelta(days=5),
        "updated_at": utc_now() - timedelta(days=4),
    }
    await documents_medicaux_collection.insert_one(doc_labo)

    # Document déposé directement par un médecin (hors demande d'examen),
    # sans interprétation encore ajoutée — pour tester l'état vide de
    # « Ajouter une interprétation médicale » dès le premier lancement.
    pdf_bilan = _generer_pdf_resultat(
        "Bilan sanguin — Koffi Dossou",
        [
            "NPI : 1001002001",
            "Prescripteur : Dr. Jean Kouassi",
            "",
            "Glycémie à jeun : 1,05 g/L (normale)",
            "Créatininémie : 8 mg/L (normale)",
            "Cholestérol total : 1,9 g/L (normale)",
            "",
            "Document de démonstration généré par le script de seed DMPI.",
        ],
    )
    fichier_bilan = await _sauvegarder_depuis_bytes(pdf_bilan, "bilan_sanguin_kouassi.pdf")
    doc_medecin = {
        "npi": "1001002001",
        "demande_examen_id": None,
        "type": "biologie",
        "libelle": "Bilan sanguin de routine",
        "date_realisation": utc_now() - timedelta(days=1),
        "laboratoire_nom": None,
        "prestataire_id": None,
        "uploade_par_email": "dr.kouassi@dmpi.bj",
        "uploade_par_role": "medecin",
        "commentaire": "Bilan de contrôle annuel, résultats dans la norme.",
        "interpretation_medecin": None,
        "interpretation_par_email": None,
        "fichiers": [fichier_bilan],
        "statut": "disponible",
        "created_at": utc_now() - timedelta(days=1),
        "updated_at": None,
    }
    await documents_medicaux_collection.insert_one(doc_medecin)


# ─── Main ────────────────────────────────────────────────────────────────────

async def reset_et_seed():
    print("=" * 60)
    print("  DMPI — Script de seed complet")
    print("=" * 60)

    # 1. Vider PostgreSQL
    print("\n[1/11] Vidage de PostgreSQL...")
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
    print("\n[2/11] Vidage de MongoDB...")
    await dossiers_medicaux_collection.delete_many({})
    await consultations_collection.delete_many({})
    await constantes_vitales_collection.delete_many({})
    await administrations_collection.delete_many({})
    await etablissements_collection.delete_many({})
    await ordonnances_collection.delete_many({})
    await rendez_vous_collection.delete_many({})
    await prestataires_partenaires_collection.delete_many({})
    await demandes_examen_collection.delete_many({})
    await documents_medicaux_collection.delete_many({})
    await file_attente_collection.delete_many({})
    print("    ✓ Collections MongoDB vidées.")

    # 3. Créer les établissements
    print("\n[3/11] Création des établissements...")
    etab_docs = ETABLISSEMENTS
    result = await etablissements_collection.insert_many(etab_docs)
    etab_ids = [str(oid) for oid in result.inserted_ids]
    etab_cnhu_id = etab_ids[0]
    etab_borgou_id = etab_ids[1]
    etab_natitingou_id = etab_ids[2]
    etab_clinique_id = etab_ids[3]
    print(f"    ✓ CNHU-HKM id={etab_cnhu_id}")
    print(f"    ✓ CHD Borgou id={etab_borgou_id}")
    print(f"    ✓ CSC Natitingou id={etab_natitingou_id}")
    print(f"    ✓ Clinique Louis Pasteur id={etab_clinique_id}")

    # 4. Créer les prestataires partenaires (pharmacies + laboratoires) —
    # avant les utilisateurs, car les comptes laboratoire de démo ont besoin
    # des ids Mongo réels pour leur prestataire_id.
    print("\n[4/11] Insertion des prestataires partenaires (pharmacies, laboratoires)...")
    prestataires = make_prestataires()
    prest_result = await prestataires_partenaires_collection.insert_many(prestataires)
    prest_ids = [str(oid) for oid in prest_result.inserted_ids]
    labo_cotonou_id = prest_ids[-2]
    labo_parakou_id = prest_ids[-1]
    print(f"    ✓ {len(prestataires)} prestataires partenaires insérés (2 laboratoires).")

    # 5. Créer les utilisateurs
    print("\n[5/11] Création des utilisateurs PostgreSQL...")
    users_data = make_users(etab_cnhu_id, etab_borgou_id, etab_natitingou_id, etab_clinique_id, labo_cotonou_id, labo_parakou_id)
    async with AsyncSessionLocal() as db:
        for u in users_data:
            db.add(User(**u))
        await db.commit()
    print(f"    ✓ {len(users_data)} utilisateurs créés.")

    # 6. Créer les dossiers, consultations et constantes MongoDB
    print("\n[6/11] Insertion des données cliniques MongoDB...")
    dossiers = make_dossiers(etab_cnhu_id, etab_borgou_id, etab_natitingou_id, etab_clinique_id)
    await dossiers_medicaux_collection.insert_many(dossiers)
    print(f"    ✓ {len(dossiers)} dossiers médicaux insérés.")

    consultations = make_consultations(etab_cnhu_id, etab_borgou_id, etab_natitingou_id, etab_clinique_id)
    consult_result = await consultations_collection.insert_many(consultations)
    consult_ids = [str(oid) for oid in consult_result.inserted_ids]
    print(f"    ✓ {len(consultations)} consultations insérées.")

    constantes = make_constantes(etab_cnhu_id, etab_borgou_id, etab_natitingou_id, etab_clinique_id)
    await constantes_vitales_collection.insert_many(constantes)
    print(f"    ✓ {len(constantes)} constantes vitales insérées.")

    # 7. Créer les ordonnances et rendez-vous MongoDB
    print("\n[7/11] Insertion des ordonnances et rendez-vous MongoDB...")
    ordonnances = make_ordonnances(consult_ids)
    await ordonnances_collection.insert_many(ordonnances)
    print(f"    ✓ {len(ordonnances)} ordonnances insérées.")

    rdvs = make_rdv()
    await rendez_vous_collection.insert_many(rdvs)
    print(f"    ✓ {len(rdvs)} rendez-vous planifiés.")

    # 8. Créer la file d'attente de triage infirmier
    print("\n[8/11] Insertion de la file d'attente infirmier...")
    entrees_file_attente = make_file_attente(etab_cnhu_id, etab_borgou_id, etab_natitingou_id)
    await file_attente_collection.insert_many(entrees_file_attente)
    print(f"    ✓ {len(entrees_file_attente)} entrées de file d'attente insérées.")

    # 9. Créer les demandes d'accès patient
    print("\n[9/11] Insertion des demandes d'accès portail patient...")
    demandes_acces = make_demandes_acces(etab_natitingou_id, etab_clinique_id, etab_borgou_id)
    async with AsyncSessionLocal() as db:
        for d in demandes_acces:
            db.add(DemandeAccesPatient(**d))
        await db.commit()
    print(f"    ✓ {len(demandes_acces)} demandes d'accès insérées.")

    # 10. Créer les délégations d'accès entre confrères
    print("\n[10/11] Insertion des délégations d'accès entre confrères...")
    delegations = make_delegations()
    async with AsyncSessionLocal() as db:
        for d in delegations:
            db.add(DelegationAcces(**d))
        await db.commit()
    print(f"    ✓ {len(delegations)} délégations d'accès insérées.")

    # 11. Créer les demandes d'examen et documents médicaux (avec de vrais
    # fichiers écrits sur le volume `uploads`, pas de simples métadonnées).
    print("\n[11/11] Insertion des demandes d'examen et documents médicaux...")
    await seed_examens_et_documents(labo_cotonou_id, labo_parakou_id)
    print("    ✓ 3 demandes d'examen et 2 documents médicaux (fichiers réels) insérés.")

    print("\n" + "=" * 60)
    print("  Seed terminé avec succès !")
    print("=" * 60)
    print("\n  Comptes de connexion :")
    print("  ┌─ Super Admin  : superadmin@dmpi.bj       / Admin2025!")
    print("  ├─ Médecin      : dr.kouassi@dmpi.bj       / Medecin2025!")
    print("  ├─ Infirmier    : inf.mensah@dmpi.bj       / Infirmier2025!")
    print("  ├─ Laboratoire  : labo.bioanalyses@dmpi.bj / Labo2025!")
    print("  └─ Patient      : patient.dossou@dmpi.bj   / Patient2025!")


if __name__ == "__main__":
    asyncio.run(reset_et_seed())
