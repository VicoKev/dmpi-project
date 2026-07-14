# DMPI — Dossier Médical Partagé Interopérable du Bénin

Une architecture polyglotte (SQL + NoSQL/FHIR) pour connecter les hôpitaux du Bénin et sauver des vies grâce à l'information médicale partagée.

\---

## Sommaire

* [Contexte](#contexte)
* [Architecture](#architecture)
* [Stack technique](#stack-technique)
* [Fonctionnalités](#fonctionnalités)
* [Installation & Lancement (Docker)](#installation--lancement-docker--recommandé)
* [Accès aux bases de données](#accès-aux-bases-de-données-depuis-lhôte)
* [Utilisation de l'API](#utilisation-de-lapi)
* [Structure du projet](#structure-du-projet)
* [Sécurité](#sécurité)

\---

## Contexte

Au Bénin, l'historique médical d'un patient reste souvent bloqué dans l'hôpital où il a été créé. Quand un patient change d'établissement, ses antécédents, traitements et examens ne le suivent pas — ce qui peut coûter des vies en situation d'urgence.

**DMPI** est une plateforme nationale qui collecte, structure et met à disposition le dossier médical de chaque patient, pour n'importe quel professionnel de santé autorisé, où qu'il exerce.

## Architecture

Le projet repose sur une **persistance polyglotte** : la sécurité et la donnée médicale ne partagent pas le même moteur de stockage.

```
React.js  →  FastAPI  →  Apache Kafka
(interface)  (API)       (bus d'événements)
                │
        ┌───────┴────────┐
        ▼                ▼
   PostgreSQL         MongoDB
 (Pilier Sécurité)  (Pilier Santé)
```

|Pilier|Rôle|
|-|-|
|**PostgreSQL**|Comptes utilisateurs, authentification, journal d'audit immuable (Append-Only)|
|**MongoDB**|Dossiers médicaux, consultations, ordonnances, constantes vitales (documents JSON flexibles, alignés FHIR)|
|**Apache Kafka**|Streaming d'événements pour les notifications temps réel entre établissements|

## Stack technique

* **Backend** : FastAPI (Python)
* **Base SQL** : PostgreSQL 18 + SQLAlchemy (async) + asyncpg
* **Base NoSQL** : MongoDB + Motor (async)
* **Streaming** : Apache Kafka + aiokafka
* **Authentification** : JWT (python-jose) + hashage bcrypt (passlib) — schéma **HTTP Bearer** standard (compatible test direct via Swagger)
* **Validation** : Pydantic

## Fonctionnalités

Toutes les fonctionnalités listées ci-dessous ont été testées manuellement de bout en bout (requêtes réelles via Swagger, vérification en base PostgreSQL/MongoDB et des logs Kafka).

### MVP prioritaire

* ✅ Connexion par identifiants (email/mot de passe)
* ✅ Identification stricte par NPI (Numéro Personnel d'Identification, 10 chiffres)
* ✅ Dossier patient unifié (allergies, groupe sanguin, antécédents, traitements en cours)
* ✅ Création de consultations (motif, diagnostic CIM-10, conclusion)
* ✅ Rédaction d'ordonnances numériques (rattachées à la consultation)
* ✅ Gestion centralisée des comptes (Super Admin)
* ✅ Gestion dynamique des établissements de santé (Création, édition, désactivation via MongoDB)
* ✅ Affectation croisée : Rattachement des utilisateurs (PostgreSQL) à leur établissement (MongoDB)
* ✅ Journalisation Append-Only de chaque action (PostgreSQL)
* ✅ Mode urgence / Protocole "Break the Glass"
* ✅ Différenciation des rôles (médecin, infirmier, admin établissement, super admin, patient)

### Fonctionnalités étendues

* ✅ **Espace infirmier** : saisie et historique des constantes vitales (tension, pouls, température, SpO2), validation de l'administration des traitements prescrits
* ✅ **Espace patient (lecture seule)** : consultation de son propre dossier (`/patients/me`), export au format FHIR ou JSON simplifié
* ✅ **Tableaux de bord** : KPIs d'établissement (utilisateurs, activité clinique, urgences) et vue nationale (épidémiologie CIM-10, statistiques d'accès Break the Glass)
* ✅ **Délégation temporaire d'accès** : un médecin/infirmier peut habiliter un confrère sur un dossier précis, pour une durée limitée, avec révocation possible
* ✅ **Console d'audit** (`/admin/logs`) : consultation filtrable (par NPI, utilisateur ou action) de l'intégralité du journal append-only, réservée au Super Admin
* ✅ **Streaming Kafka** : publication d'événements temps réel pour les consultations, mises à jour de dossier, et saisies de constantes vitales

### Rôles utilisateurs

|Rôle|Accès|
|-|-|
|`super\_admin`|Gestion des comptes, dashboards, console d'audit, supervision nationale|
|`medecin`|Consultations, ordonnances, dossier complet, délégation d'accès|
|`infirmier`|Constantes vitales, administration des traitements, délégation d'accès|
|`admin\_etablissement`|Dashboard d'établissement|
|`patient`|Lecture seule de son propre dossier, export FHIR|

## Installation & Lancement (Docker — recommandé)

Toute la stack (PostgreSQL, MongoDB, Kafka, Zookeeper, API FastAPI) tourne via Docker Compose. C'est la méthode officielle du projet — pas d'installation locale de Postgres/Mongo/Kafka nécessaire.

### Prérequis

* Docker + Docker Compose

### Cloner le dépôt et configurer l'environnement

```bash
git clone https://github.com/VicoKev/dmpi-backend.git
cd dmpi-backend
cp .env.example .env
```

Éditez `.env` et changez au minimum `JWT_SECRET_KEY` et `ADMIN_INITIAL_PASSWORD` :

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"   # pour JWT_SECRET_KEY
```

> `.env` est exclu du dépôt par `.gitignore` — vérifiez toujours avec `git status` avant un commit qu'aucun secret n'apparaît. `.env.example` sert de modèle versionné, sans secret réel.

### Démarrer la stack

```bash
docker compose up -d --build
```

Ceci démarre 5 conteneurs : `dmpi-postgres`, `dmpi-mongodb`, `dmpi-zookeeper`, `dmpi-kafka`, `dmpi-fastapi`. Les tables PostgreSQL (`users`, `audit_logs`, `delegations_acces`) sont créées automatiquement au démarrage de l'API.

L'API est accessible sur `http://localhost:8000` (Swagger : `http://localhost:8000/docs`).

### Peupler la base avec des données de démonstration

```bash
docker compose exec backend python seed_complet.py
```

Ce script vide puis recrée un jeu de données complet et cohérent : établissements (MongoDB), comptes utilisateurs de tous les rôles (PostgreSQL), dossiers médicaux, consultations, ordonnances, constantes vitales et rendez-vous (MongoDB). Tous les emails sont sur le domaine `@dmpi.bj`. Les comptes créés sont affichés à la fin de l'exécution du script (super admin, médecin, infirmier, patient, etc.).

Alternative minimaliste : `docker compose exec backend python create_admin.py` ne crée que le premier compte Super Admin (mot de passe lu depuis `ADMIN_INITIAL_PASSWORD`), sans jeu de données de démonstration.

### Arrêter / réinitialiser la stack

```bash
docker compose down          # arrête les conteneurs, conserve les données (volumes)
docker compose down -v       # arrête et supprime aussi les volumes (reset complet)
```

## Accès aux bases de données depuis l'hôte

Les ports des bases sont exposés sur `localhost` pour pouvoir les inspecter avec des outils graphiques.

### PostgreSQL (pgAdmin4, DBeaver, psql...)

| Champ | Valeur |
|-|-|
| Host | `localhost` |
| Port | **`5433`** ⚠️ (PostgreSQL écoute sur `5432` *dans* le conteneur, mais Docker le mappe sur `5433` côté hôte pour ne pas entrer en conflit avec un éventuel PostgreSQL déjà installé sur la machine — voir `docker-compose.yml`) |
| Database | `dmpi_db` |
| User | valeur de `POSTGRES_USER` dans `.env` (`postgres` par défaut) |
| Password | valeur de `POSTGRES_PASSWORD` dans `.env` |

### MongoDB (MongoDB Compass, mongosh...)

Chaîne de connexion (adapter user/password si modifiés dans `.env`) :

```
mongodb://admin:admin123@localhost:27017/?authSource=admin
```

Base à ouvrir : `dmpi_db`.

> Si vous connectez un outil graphique et voyez une base `dmpi_db` vide ou avec des données inattendues, vérifiez d'abord qu'aucun PostgreSQL/MongoDB natif ne tourne déjà sur votre machine avec les mêmes ports par défaut (5432 pour Postgres, 27017 pour Mongo) — c'est la source d'erreur la plus fréquente en local.

## Utilisation de l'API

### Documentation interactive

Swagger UI : `http://127.0.0.1:8000/docs`

### Authentification

```bash
POST /auth/login
{
  "email": "admin@dmpi.bj",
  "mot\_de\_passe": "..."
}
```

Retourne un token JWT. Dans Swagger, cliquez sur **Authorize** et collez le token brut (schéma HTTP Bearer standard — pas de préfixe `Bearer` à ajouter manuellement, Swagger s'en charge).

Pour un appel direct :

```
Authorization: Bearer <token>
```

La liste complète des routes (méthode, paramètres, schémas de requête/réponse, rôle requis) est générée automatiquement et disponible dans Swagger — chaque route y est de toute façon protégée par le même contrôle d'accès JWT/rôle qu'en production, elle n'a donc pas besoin d'être dupliquée ici.

## Structure du projet

```
dmpi-backend/
├── app/
│   ├── main.py                  # Point d'entrée FastAPI
│   ├── security.py              # Hashage, JWT (HTTP Bearer), contrôle des rôles
│   ├── audit.py                 # Journalisation Append-Only
│   ├── context.py                # ContextVar pour l'IP client (audit)
│   ├── kafka_producer.py        # Publication d'événements Kafka
│   ├── database_sql.py          # Connexion PostgreSQL (SQLAlchemy async)
│   ├── database_mongo.py        # Connexion MongoDB (Motor)
│   ├── models_sql.py            # Modèles PostgreSQL (User, AuditLog, DelegationAcces)
│   ├── schemas/                 # Schémas Pydantic
│   │   ├── user.py
│   │   ├── etablissement.py
│   │   ├── dossier_medical.py
│   │   ├── consultation.py
│   │   ├── ordonnance.py
│   │   ├── soins.py
│   │   ├── patient.py
│   │   ├── delegation.py
│   │   └── logs.py
│   └── routes/                  # Endpoints de l'API
│       ├── auth.py
│       ├── admin.py
│       ├── etablissement.py
│       ├── dossier_medical.py
│       ├── consultation.py
│       ├── ordonnance.py
│       ├── urgence.py
│       ├── soins.py
│       ├── patient.py
│       ├── rdv.py
│       ├── dashboard.py
│       └── delegation.py
├── create_admin.py              # Crée le premier compte Super Admin (mot de passe via .env)
├── seed_complet.py              # Jeu de données de démo complet (établissements, comptes, dossiers...)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example                 # Modèle de configuration, à copier vers .env
├── .env                          # Non versionné
└── .gitignore
```

## Sécurité

* Mots de passe hashés avec bcrypt, jamais stockés en clair
* Clé de signature JWT et mot de passe du premier compte admin lus depuis `.env`, jamais codés en dur dans le dépôt
* Tokens JWT signés avec expiration (2h par défaut)
* Chaque action sensible (recherche NPI, création, accès urgence, délégation) est tracée dans `audit\_logs`, une table Append-Only : aucune suppression ni modification possible
* Différenciation stricte des permissions par rôle (`require\_role`)
* Isolation des données patient : un compte `patient` ne peut consulter que son propre dossier (rattaché via `npi\_patient`)

\---

*Projet réalisé dans le cadre du cours NoSQL — Architecture polyglotte SQL + NoSQL/FHIR.*

