from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
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
    role = Column(String, nullable=False)  # "medecin", "infirmier", "admin_etablissement", "super_admin", "patient", "laboratoire"
    specialite = Column(String, nullable=True)
    service = Column(String, nullable=True)
    npi_patient = Column(String(10), nullable=True)  # renseigné uniquement si role == "patient"
    etablissement_id = Column(String, nullable=True)  # ID MongoDB de l'établissement de rattachement
    prestataire_id = Column(String, nullable=True)  # ID MongoDB du prestataire (labo) de rattachement, si role == "laboratoire"
    disponible = Column(Boolean, default=True, nullable=False)  # medecin uniquement : dispo pour assignation (garde)
    est_actif = Column(Boolean, default=True, nullable=False)
    # Incrémenté à chaque changement/réinitialisation de mot de passe — un
    # token JWT émis avant devient invalide immédiatement (voir get_current_user).
    token_version = Column(Integer, default=0, nullable=False)
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


class DemandeReinitialisationMotDePasse(Base):
    """
    Signal "mot de passe oublié" — la personne ne peut pas se connecter donc
    ne peut rien demander en tant qu'utilisateur authentifié. Traitée par le
    Super Admin national, seul habilité à réinitialiser un mot de passe, qui
    communique le nouveau par un canal hors application (pas d'email/SMS).
    """
    __tablename__ = "demandes_reinitialisation_mot_de_passe"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    statut = Column(String, default="en_attente", nullable=False)  # "en_attente", "traitee"
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_traitement = Column(DateTime, nullable=True)
    traite_par = Column(String, nullable=True)  # email du super_admin ayant réinitialisé le mot de passe


class SignalementCorrectionCompte(Base):
    """
    Auto-service : le titulaire d'un compte signale une erreur sur ses
    propres informations (faute de frappe, mauvaise spécialité...) — lui
    seul ne peut pas les corriger, ces champs restent du ressort du
    super_admin (voir PATCH /admin/users/{id}, qui résout automatiquement
    tout signalement en attente pour ce compte).

    Contrairement à la demande de réinitialisation de mot de passe,
    l'auteur reste connecté pendant tout le cycle de vie du signalement —
    `vu` lui permet de savoir qu'une résolution est intervenue depuis sa
    dernière consultation de "Mes signalements", sans avoir à deviner.
    """
    __tablename__ = "signalements_correction_compte"

    id = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    motif = Column(String, nullable=False)
    statut = Column(String, default="en_attente", nullable=False)  # "en_attente", "traitee"
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_traitement = Column(DateTime, nullable=True)
    traite_par = Column(String, nullable=True)  # email du super_admin ayant traité le signalement
    # Vrai tant qu'il n'y a rien de nouveau à voir (en attente, ou déjà
    # consulté après résolution) ; mis à faux au moment de la résolution,
    # remis à vrai quand l'auteur consulte "Mes signalements".
    vu = Column(Boolean, default=True, nullable=False)
    # Justificatif obligatoire à la création (voir schemas/signalement_correction.py) —
    # nullable ici pour ne pas invalider les signalements créés avant cette exigence.
    document_nom_original = Column(String, nullable=True)
    document_chemin_stockage = Column(String, nullable=True)
    document_type_mime = Column(String, nullable=True)


class Departement(Base):
    """
    Découpage territorial du Bénin (référentiel officiel, table en lecture seule
    chargée une fois via load_territoire.py à partir de decoupage_territorial_benin.sql).
    """
    __tablename__ = "departement"

    id_dep = Column(Integer, primary_key=True)
    lib_dep = Column(String(250), nullable=False)


class Commune(Base):
    __tablename__ = "commune"

    id_com = Column(Integer, primary_key=True)
    lib_com = Column(String(250), nullable=False)
    id_dep = Column(Integer, ForeignKey("departement.id_dep"), nullable=False)


class Arrondissement(Base):
    __tablename__ = "arrondissement"

    id_arrond = Column(Integer, primary_key=True)
    lib_arrond = Column(String(250), nullable=False)
    id_com = Column(Integer, ForeignKey("commune.id_com"), nullable=False)


class Quartier(Base):
    __tablename__ = "quartier"

    id_quart = Column(Integer, primary_key=True)
    lib_quart = Column(String(250), nullable=False)
    id_arrond = Column(Integer, ForeignKey("arrondissement.id_arrond"), nullable=False)


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