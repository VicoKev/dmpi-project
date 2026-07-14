# DMPI Bénin - Dossier Médical Partagé Informatisé (Frontend)

Ce dépôt contient l'interface (Frontend) du **Dossier Médical Partagé Informatisé (DMPI)** pour le Bénin.
Il s'agit d'une application moderne, responsive, connectée à l'API réelle du [backend DMPI](../dmpi-backend) (FastAPI + PostgreSQL + MongoDB), et conçue pour être utilisée par différents acteurs du système de santé (Médecins, Infirmiers, Patients, Admins établissement, Super Admin).

## 🚀 Fonctionnalités implémentées

L'application gère une navigation dynamique basée sur les rôles. 5 espaces distincts ont été modélisés :

1. **🩺 Espace Médecin**
   - Tableau de bord des consultations du jour.
   - Vue détaillée du Dossier Patient (Synthèse, Antécédents, Traitements, Examens, etc.).
   - Saisie de consultations avec recherche de codes CIM-10.
   - Création d'ordonnances avec alertes d'allergies.

2. **💉 Espace Infirmier**
   - Prise rapide de constantes vitales avec détection des valeurs hors-normes.
   - Suivi et administration des traitements (dispensation).
   - Dossier patient orienté soins infirmiers.

3. **👤 Espace Patient**
   - Portail personnel vulgarisé.
   - Historique des ordonnances et résultats d'examens biologiques/imagerie.
   - Vue sur les rendez-vous passés et à venir.

4. **🏥 Espace Admin Établissement**
   - Tableau de bord KPI (taux d'occupation, statistiques de services).
   - Graphiques de répartition (CIM-10, consultations).
   - Supervision en temps réel du personnel médical.

5. **🛡️ Espace Super Admin National**
   - Supervision globale et **gestion dynamique des établissements** connectés (CRUD via API NoSQL).
   - Gestion des comptes utilisateurs (création, modification, désactivation via PostgreSQL).
   - Affectation des professionnels de santé à leur établissement de rattachement.
   - Journal d'audit complet de sécurité (traces de connexions, signatures, erreurs).

## 🛠️ Stack Technique

- **Framework :** [React Router v7](https://reactrouter.com/) (ex-Remix) - SSR (Server-Side Rendering) activé.
- **Style :** [Tailwind CSS v4](https://tailwindcss.com/) avec un design system personnalisé (`@theme`).
- **Typage :** TypeScript strict.
- **Gestionnaire de paquets :** pnpm (le seul supporté — ne pas utiliser `npm install`, cela régénère un `package-lock.json` en plus de `pnpm-lock.yaml` et désynchronise les dépendances de l'équipe).
- **Architecture :**
  - `app/routes/` : Routes basées sur les fichiers (regroupées par rôle), déclarées dans `app/routes.ts`.
  - `app/components/ui/` : Composants de base (Design System DMPI).
  - `app/components/layout/` : AppShell (Responsive Sidebar / BottomNav mobile).
  - `app/services/` : Couche d'accès à l'API backend (`apiFetch` dans `services/api.ts`, un service par domaine métier). Seul `cim10Service.ts` est une base de données locale statique (référentiel de codes CIM-10), volontairement non servi par l'API.

## 💻 Installation & Lancement

### 1. Prérequis
- Node.js (v18 ou supérieur)
- pnpm (`corepack enable` si non installé, ou `npm install -g pnpm`)
- Le [backend DMPI](../dmpi-backend) démarré (voir son README — `docker compose up -d --build` puis `docker compose exec backend python seed_complet.py` pour avoir des comptes de démo)

### 2. Configuration

Créer un fichier `.env` à la racine si l'API ne tourne pas sur `http://localhost:8000` :

```env
VITE_API_URL=http://localhost:8000
```

Sans ce fichier, l'application pointe vers `http://localhost:8000` par défaut (voir `app/services/api.ts`).

### 3. Installation

```bash
pnpm install
```

### 4. Lancement en mode développement

```bash
pnpm dev
```

L'application sera disponible sur `http://localhost:5173` (port par défaut de Vite en mode dev ; `http://localhost:3000` en production via `pnpm start`, voir plus bas — les deux sont déjà autorisés par le CORS du backend).

> **⚠️ Note sur le "Cold Start" (CSS Tailwind v4)**
> Lors du tout premier lancement (`pnpm dev`), la page peut parfois s'afficher sans style pendant quelques secondes. C'est un comportement du compilateur Tailwind v4 JIT couplé au SSR en dev. Attendez quelques secondes ou **rafraîchissez la page (F5)**. Ce comportement n'existe pas en production.

## 🔑 Se connecter

L'authentification passe par l'API réelle (`POST /auth/login`, token JWT stocké en `localStorage`). Il faut donc que le backend soit démarré et peuplé (`docker compose exec backend python seed_complet.py` — voir le README backend).

Sur la page de connexion (`/login`), des boutons **"Dev Only - Remplissage rapide"** pré-remplissent les identifiants des comptes de démonstration créés par `seed_complet.py` (domaine `@dmpi.bj`) :

- **Médecin** : `dr.kouassi@dmpi.bj` / `••••••••`
- **Infirmier** : `inf.mensah@dmpi.bj` / `••••••••`
- **Patient** : `patient.dossou@dmpi.bj` / `••••••••`
- **Admin établissement** : `admin.cnhu@dmpi.bj` / `••••••••`
- **Super Admin** : `superadmin@dmpi.bj` / `••••••••`

> Les mots de passe ne sont volontairement pas versionnés ici. Demandez-les à la personne qui a lancé `seed_complet.py` sur votre environnement (canal d'équipe privé), ou relisez la sortie console du script — elle les affiche en clair à l'exécution.

Ces boutons ne fonctionnent que si le backend a été peuplé avec `seed_complet.py` ; sinon utilisez un compte que vous avez créé vous-même via `/admin/users` ou `create_admin.py`.

## 📦 Build pour la Production

```bash
pnpm build
pnpm start
```

## 🗂️ Structure des services (appels API)

Toute la donnée provient de l'API FastAPI (`app/services/api.ts` → `apiFetch`), à l'exception du référentiel CIM-10 :

- `app/services/authService.ts` : login, stockage du token JWT.
- `app/services/userService.ts` : gestion des comptes (Super Admin).
- `app/services/patientService.ts` : dossier médical.
- `app/services/consultationService.ts`, `prescriptionService.ts` : consultations et ordonnances.
- `app/services/constanstesService.ts`, `administrationService.ts` : soins infirmiers.
- `app/services/etablissementService.ts` : établissements de santé.
- `app/services/rdvService.ts` : rendez-vous.
- `app/services/dashboardService.ts` : KPIs et statistiques.
- `app/services/cim10Service.ts` : recherche de codes CIM-10 — base statique locale, pas d'appel réseau.
