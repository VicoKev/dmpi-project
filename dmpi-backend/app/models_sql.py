from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.database_sql import Base
from datetime import datetime

class AuditLog(Base):
    """
    Table PostgreSQL immuable (Append-Only) pour tracer
    les accès aux données médicales des patients du Bénin.
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    utilisateur_email = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)
    npi_concerne = Column(String(10), nullable=True, index=True)
    statut_action = Column(String, nullable=False)
    horodatage = Column(DateTime, default=datetime.utcnow, nullable=False)
    adresse_ip = Column(String, nullable=True)


class User(Base):
    """
    Table PostgreSQL des comptes utilisateurs (médecins, infirmiers, admins, patients).
    Comptes configurés à l'avance par le Super Admin national — pas d'inscription en ligne.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    mot_de_passe_hash = Column(String, nullable=False)
    nom = Column(String, nullable=False)
    prenom = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "medecin", "infirmier", "admin_etablissement", "super_admin", "patient"
    specialite = Column(String, nullable=True)
    service = Column(String, nullable=True)
    npi_patient = Column(String(10), nullable=True)  # renseigné uniquement si role == "patient"
    etablissement_id = Column(String, nullable=True)  # ID MongoDB de l'établissement de rattachement
    est_actif = Column(Boolean, default=True, nullable=False)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    derniere_connexion = Column(DateTime, nullable=True)
    derniere_connexion_ip = Column(String, nullable=True)


class DemandeAccesPatient(Base):
    """
    Demande d'ouverture d'un compte portail pour un patient dont le dossier
    médical existe déjà (créé par un médecin/infirmier). Traitée par le
    Super Admin national, seul habilité à créer des comptes de connexion.
    """
    __tablename__ = "demandes_acces_patient"

    id = Column(Integer, primary_key=True, index=True)
    npi = Column(String(10), nullable=False, index=True)
    nom = Column(String, nullable=False)
    prenom = Column(String, nullable=False)
    telephone_contact = Column(String, nullable=False)
    demandeur_email = Column(String, nullable=False, index=True)  # médecin/infirmier à l'origine de la demande
    etablissement_id = Column(String, nullable=True)
    statut = Column(String, default="en_attente", nullable=False)  # "en_attente", "traite", "rejete", "annulee"
    motif_rejet = Column(String, nullable=True)  # renseigné uniquement si statut == "rejete"
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)


class DelegationAcces(Base):
    """
    Délégation temporaire d'accès à un dossier patient entre professionnels.
    Permet à un médecin/infirmier d'habiliter un confrère sur un dossier précis,
    pour une durée limitée, en son absence (congé, garde, etc.).
    """
    __tablename__ = "delegations_acces"

    id = Column(Integer, primary_key=True, index=True)
    delegant_email = Column(String, nullable=False, index=True)       # celui qui délègue
    beneficiaire_email = Column(String, nullable=False, index=True)   # celui qui reçoit l'accès
    npi_patient = Column(String(10), nullable=False, index=True)
    motif = Column(String, nullable=True)
    date_debut = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_fin = Column(DateTime, nullable=False)
    active = Column(Boolean, default=True, nullable=False)  # permet une révocation anticipée
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)