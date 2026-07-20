// Source unique de vérité pour la navigation par rôle — partagée par
// Sidebar (desktop, tout affiché) et BottomNav (mobile, un sous-ensemble +
// un onglet "Plus" pour le reste). Les garder synchronisés séparément avait
// fini par cacher plusieurs pages entières sur mobile, sans aucun moyen d'y
// accéder.
import type { UserRole } from "../../types/auth";

export interface NavItem {
  to: string;
  icon: string;
  iconActive?: string;
  label: string;
}

/** Plafond d'affichage des badges de compteur "en attente" par lien
 * (Sidebar et BottomNav) — au-delà, on affiche "99+" plutôt qu'un nombre
 * qui ferait exploser la mise en page. */
export const PLAFOND_AFFICHAGE_BADGE = 99;

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  medecin: [
    { to: "/medecin", icon: "home_health", iconActive: "home_health", label: "Tableau de bord" },
    { to: "/medecin/patients", icon: "groups", label: "Patients" },
    { to: "/medecin/consultations", icon: "medical_services", label: "Consultations" },
    { to: "/medecin/ordonnances", icon: "prescriptions", label: "Ordonnances" },
    { to: "/medecin/examens", icon: "biotech", label: "Examens" },
    { to: "/medecin/agenda", icon: "calendar_month", label: "Agenda" },
    { to: "/medecin/demandes-acces", icon: "how_to_reg", label: "Demandes d'accès" },
  ],
  infirmier: [
    { to: "/infirmier", icon: "home_health", label: "Tableau de bord" },
    { to: "/infirmier/file-attente", icon: "assignment_ind", label: "File d'attente" },
    { to: "/infirmier/patients", icon: "groups", label: "Patients" },
    { to: "/infirmier/constantes", icon: "monitor_heart", label: "Constantes" },
    { to: "/infirmier/traitements", icon: "medication", label: "Traitements" },
    { to: "/infirmier/historique", icon: "history", label: "Mon historique" },
    { to: "/infirmier/demandes-acces", icon: "how_to_reg", label: "Demandes d'accès" },
  ],
  patient: [
    { to: "/patient", icon: "home_health", label: "Mon dossier" },
    { to: "/patient/ordonnances", icon: "prescriptions", label: "Mes ordonnances" },
    { to: "/patient/resultats", icon: "lab_panel", label: "Mes résultats" },
    { to: "/patient/rendez-vous", icon: "calendar_month", label: "Mes rendez-vous" },
    { to: "/patient/etablissements-proches", icon: "local_hospital", label: "Établissements proches" },
  ],
  admin_etablissement: [
    { to: "/admin", icon: "dashboard", label: "Tableau de bord" },
    { to: "/admin/supervision", icon: "supervisor_account", label: "Supervision" },
    { to: "/admin/statistiques", icon: "bar_chart", label: "Statistiques" },
    { to: "/admin/etablissement", icon: "edit_location", label: "Mon établissement" },
    { to: "/admin/file-attente", icon: "assignment_ind", label: "File d'attente" },
    { to: "/admin/demandes-acces", icon: "how_to_reg", label: "Demandes d'accès" },
  ],
  superadmin_national: [
    { to: "/superadmin", icon: "dashboard", label: "Tableau de bord" },
    { to: "/superadmin/etablissements", icon: "domain", label: "Établissements" },
    { to: "/superadmin/prestataires", icon: "storefront", label: "Pharmacies & Laboratoires" },
    { to: "/superadmin/utilisateurs", icon: "manage_accounts", label: "Utilisateurs" },
    { to: "/superadmin/demandes-acces", icon: "how_to_reg", label: "Demandes d'accès" },
    { to: "/superadmin/audit", icon: "policy", label: "Journal d'audit" },
    { to: "/superadmin/monitoring", icon: "monitoring", label: "Monitoring" },
    { to: "/superadmin/rapports", icon: "analytics", label: "Rapports" },
  ],
  laboratoire: [
    { to: "/laboratoire", icon: "biotech", label: "Demandes d'examen" },
  ],
};

/** Vrai pour la route "accueil" de chaque rôle — NavLink a besoin de `end`
 * pour ne pas rester actif sur toutes les sous-routes du rôle. */
export function estRacineDeRole(to: string, role: UserRole): boolean {
  return (
    to === `/${role}` ||
    to === "/patient" ||
    to === "/admin" ||
    to === "/superadmin"
  );
}
