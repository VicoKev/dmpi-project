import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  layout("components/layout/AppShell.tsx", [
    index("routes/home.tsx"),

    // ─── Espace Médecin ───────────────────────────────────────────────
    route("medecin", "routes/medecin/dashboard.tsx"),
    route("medecin/patients", "routes/medecin/patients.tsx"),
    route("medecin/patients/nouveau", "routes/medecin/patients.nouveau.tsx"),
    route("medecin/consultations", "routes/medecin/consultations.tsx"),
    route("medecin/ordonnances", "routes/medecin/ordonnances.tsx"),
    route("medecin/agenda", "routes/medecin/agenda.tsx"),
    route("medecin/dossier/:npi", "routes/medecin/dossier.$npi.tsx"),
    route("medecin/dossier/:npi/modifier", "routes/medecin/dossier.$npi.modifier.tsx"),
    route("medecin/dossier/:npi/consultation/nouvelle", "routes/medecin/nouvelle-consultation.$npi.tsx"),
    route("medecin/dossier/:npi/ordonnance/nouvelle", "routes/medecin/nouvelle-ordonnance.$npi.tsx"),
    route("medecin/demandes-acces", "routes/medecin/demandes-acces.tsx"),

    // ─── Espace Infirmier ─────────────────────────────────────────────
    route("infirmier", "routes/infirmier/dashboard.tsx"),
    route("infirmier/patients", "routes/infirmier/patients.tsx"),
    route("infirmier/patients/nouveau", "routes/infirmier/patients.nouveau.tsx"),
    route("infirmier/constantes", "routes/infirmier/constantes.tsx"),
    route("infirmier/traitements", "routes/infirmier/traitements.tsx"),
    route("infirmier/dossier/:npi", "routes/infirmier/dossier.$npi.tsx"),
    route("infirmier/demandes-acces", "routes/infirmier/demandes-acces.tsx"),
    route("infirmier/file-attente", "routes/infirmier/file-attente.tsx"),
    route("infirmier/historique", "routes/infirmier/historique.tsx"),

    // ─── Espace Patient ───────────────────────────────────────────────
    route("patient", "routes/patient/dashboard.tsx"),
    route("patient/ordonnances", "routes/patient/ordonnances.tsx"),
    route("patient/resultats", "routes/patient/resultats.tsx"),
    route("patient/rendez-vous", "routes/patient/rendez-vous.tsx"),

    // ─── Espace Admin Établissement ───────────────────────────────────
    route("admin", "routes/admin/dashboard.tsx"),
    route("admin/supervision", "routes/admin/supervision.tsx"),
    route("admin/statistiques", "routes/admin/statistiques.tsx"),
    route("admin/etablissement", "routes/admin/etablissement.tsx"),
    route("admin/file-attente", "routes/admin/file-attente.tsx"),
    route("admin/demandes-acces", "routes/admin/demandes-acces.tsx"),

    // ─── Espace Laboratoire ───────────────────────────────────────────
    route("laboratoire", "routes/laboratoire/dashboard.tsx"),

    // ─── Espace Super Admin National ──────────────────────────────────
    route("superadmin", "routes/superadmin/dashboard.tsx"),
    route("superadmin/audit", "routes/superadmin/audit.tsx"),
    route("superadmin/etablissements", "routes/superadmin/etablissements.tsx"),
    route("superadmin/prestataires", "routes/superadmin/prestataires.tsx"),
    route("superadmin/utilisateurs", "routes/superadmin/utilisateurs.tsx"),
    route("superadmin/demandes-acces", "routes/superadmin/demandes-acces.tsx"),
    route("superadmin/monitoring", "routes/superadmin/monitoring.tsx"),
    route("superadmin/rapports", "routes/superadmin/rapports.tsx"),
  ]),
] satisfies RouteConfig;


