# DMPI Bénin - Dossier Médical Partagé Informatisé (Frontend)

Ce dépôt contient le prototype interactif (Frontend) du **Dossier Médical Partagé Informatisé (DMPI)** pour le Bénin. 
Il s'agit d'une application moderne, responsive, et conçue pour être utilisée par différents acteurs du système de santé (Médecins, Infirmiers, Patients, Administrateurs).

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
- **Architecture :**
  - `app/routes/` : Routes basées sur les fichiers (regroupées par rôle).
  - `app/components/ui/` : Composants de base (Design System DMPI).
  - `app/components/layout/` : AppShell (Responsive Sidebar / BottomNav mobile).
  - `app/services/` : Couche de services "mockée" (simulant les appels API avec des délais artificiels).

## 💻 Installation & Lancement (Local)

L'application est configurée pour fonctionner sans backend externe (les données sont simulées côté frontend).

### 1. Prérequis
- Node.js (v18 ou supérieur)
- npm

### 2. Installation
```bash
npm install
```

### 3. Lancement en mode développement
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3000`.

> **⚠️ Note sur le "Cold Start" (CSS Tailwind v4)**
> Lors du tout premier lancement (`npm run dev`), la page peut parfois s'afficher sans style pendant quelques secondes. C'est un comportement du compilateur Tailwind v4 JIT couplé au SSR en dev. Attendez quelques secondes ou **rafraîchissez la page (F5)**. Ce comportement n'existe pas en production.

## 🔑 Se connecter (Mode Démo)

Une fois sur la page de connexion (`/login`), **5 boutons "Dev Only - Remplissage rapide"** sont disponibles en bas de l'écran.
Ils permettent de remplir automatiquement les identifiants pour tester les différents profils :

- **Médecin** : `dr.kouassi@cnhu-cotonou.bj`
- **Infirmier** : `inf.mensah@cnhu-cotonou.bj`
- **Patient** : `patient@dmpi.bj`
- **Admin** : `admin@hopital-parakou.bj`
- **Superadmin** : `superadmin@dmpi-benin.gov.bj`

Cliquez sur un profil puis sur "Se connecter" pour accéder à l'espace correspondant.

## 📦 Build pour la Production

Pour vérifier le typage et générer les assets statiques minifiés de production :

```bash
npm run build
npm run start
```

## 🏗️ Structure des données mockées

Aucune base de données réelle n'est connectée. Les données se trouvent dans :
- `app/services/patientService.ts` : Données des patients (NPI, constantes, examens).
- `app/services/consultationService.ts` & `prescriptionService.ts` : Actes médicaux.
- `app/services/authService.ts` : Logique d'authentification et JWT simulé.
