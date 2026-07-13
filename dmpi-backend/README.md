# DMPI — Dossier Médical Partagé Interopérable du Bénin

**Projet NoSQL — Groupe 4**

Une architecture polyglotte (SQL + NoSQL/FHIR) pour connecter les hôpitaux du Bénin et sauver des vies grâce à l'information médicale partagée.

\---

## Sommaire

* [Contexte](#contexte)
* [Architecture](#architecture)
* [Stack technique](#stack-technique)
* [Fonctionnalités](#fonctionnalités)
* [Installation](#installation)
* [Configuration](#configuration)
* [Lancement](#lancement)
* [Utilisation de l'API](#utilisation-de-lapi)
* [Structure du projet](#structure-du-projet)
* [Sécurité](#sécurité)
* [Équipe](#équipe)

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

## Installation

### Prérequis

* Python 3.12 (⚠️ éviter les versions expérimentales comme 3.14, non compatibles avec `asyncpg` sur Windows)
* PostgreSQL 18
* MongoDB Community Server
* Java 17+ (requis par Kafka)
* Apache Kafka (mode KRaft, sans Zookeeper)

### Cloner le dépôt

```bash
git clone https://github.com/VicoKev/dmpi-backend.git
cd dmpi-backend
```

### Créer l'environnement virtuel

```bash
python -m venv venv
venv\\Scripts\\activate        # Windows
source venv/bin/activate      # macOS/Linux
```

### Installer les dépendances

```bash
pip install -r requirements.txt
```

## Configuration

Créer un fichier `.env` à la racine du projet (**ne jamais le committer**) :

```env
POSTGRES\_USER=postgres
POSTGRES\_PASSWORD=votre\_mot\_de\_passe
POSTGRES\_HOST=127.0.0.1
POSTGRES\_PORT=5432
POSTGRES\_DB=dmpi\_sql

JWT\_SECRET\_KEY=une\_cle\_aleatoire\_longue\_generee\_par\_vos\_soins
ADMIN\_INITIAL\_PASSWORD=un\_mot\_de\_passe\_fort\_pour\_le\_premier\_compte\_admin
```

> Le `.gitignore` exclut déjà `.env` et `venv/` — vérifiez toujours avec `git status` avant un commit qu'aucun secret n'apparaît.

Pour générer une clé JWT sûre :

```bash
python -c "import secrets; print(secrets.token\_hex(32))"
```

### Créer la base PostgreSQL

```sql
CREATE DATABASE dmpi\_sql;
```

Les tables (`users`, `audit\_logs`, `delegations\_acces`) sont créées automatiquement au démarrage de l'application.

### Créer le premier compte Super Admin

```bash
python create\_admin.py
```

Le mot de passe est lu depuis `ADMIN\_INITIAL\_PASSWORD` (jamais écrit en dur dans le script).

## Lancement

Trois services doivent tourner en parallèle, chacun dans son propre terminal.

### 1\. MongoDB

Démarrer le service MongoDB (ou via MongoDB Compass).

### 2\. Kafka (mode KRaft)

Premier lancement uniquement :

```bash
cd chemin/vers/kafka
.\\bin\\windows\\kafka-storage.bat random-uuid
.\\bin\\windows\\kafka-storage.bat format -t <UUID\_GÉNÉRÉ> -c .\\config\\server.properties --standalone
```

À chaque démarrage (le contournement `KAFKA\_HEAP\_OPTS` évite un bug `wmic` sur certaines versions récentes de Windows) :

```bash
$env:KAFKA\_HEAP\_OPTS = "-Xmx1G -Xms1G"
.\\bin\\windows\\kafka-server-start.bat .\\config\\server.properties
```

### 3\. API FastAPI

```bash
venv\\Scripts\\activate
python -m uvicorn app.main:app --reload
```

L'API est accessible sur `http://127.0.0.1:8000`.

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

### Endpoints principaux

|Méthode|Route|Description|Accès|
|-|-|-|-|
|`POST`|`/auth/login`|Connexion|Public|
|`POST`|`/admin/users`|Créer un compte|Super Admin|
|`GET`|`/admin/users`|Lister les comptes|Super Admin|
|`PATCH`|`/admin/users/{id}/desactiver`|Désactiver un compte|Super Admin|
|`GET`|`/admin/logs`|Console d'audit (filtrable)|Super Admin|
|`POST`|`/dossiers/`|Créer un dossier médical|Authentifié|
|`GET`|`/dossiers/{npi}`|Rechercher un dossier par NPI|Authentifié|
|`PUT`|`/dossiers/{npi}`|Mettre à jour un dossier|Authentifié|
|`POST`|`/consultations/`|Enregistrer une consultation + ordonnance|Authentifié|
|`GET`|`/consultations/patient/{npi}`|Historique des consultations|Authentifié|
|`GET`|`/urgence/{npi}`|Accès urgence (Break the Glass)|Authentifié|
|`POST`|`/soins/constantes`|Saisir des constantes vitales|Infirmier, Médecin|
|`GET`|`/soins/constantes/patient/{npi}`|Historique des constantes|Authentifié|
|`POST`|`/soins/administrations`|Valider l'administration d'un traitement|Infirmier, Médecin|
|`GET`|`/patients/me`|Consulter son propre dossier|Patient|
|`GET`|`/patients/me/export`|Exporter son dossier (FHIR/JSON)|Patient|
|`GET`|`/dashboard/etablissement`|KPIs locaux|Admin établissement, Super Admin|
|`GET`|`/dashboard/national`|Supervision et épidémiologie|Super Admin|
|`POST`|`/delegations/`|Déléguer temporairement un accès|Médecin, Infirmier|
|`GET`|`/delegations/donnees`|Délégations accordées|Authentifié|
|`GET`|`/delegations/recues`|Délégations reçues|Authentifié|
|`PATCH`|`/delegations/{id}/revoquer`|Révoquer une délégation|Délégant, Super Admin|

## Structure du projet

```
dmpi-backend/
├── app/
│   ├── main.py                  # Point d'entrée FastAPI
│   ├── security.py              # Hashage, JWT (HTTP Bearer), contrôle des rôles
│   ├── audit.py                 # Journalisation Append-Only
│   ├── kafka\_producer.py        # Publication d'événements Kafka
│   ├── database\_sql.py          # Connexion PostgreSQL (SQLAlchemy async)
│   ├── database\_mongo.py        # Connexion MongoDB (Motor)
│   ├── models\_sql.py            # Modèles PostgreSQL (User, AuditLog, DelegationAcces)
│   ├── schemas/                 # Schémas Pydantic
│   │   ├── user.py
│   │   ├── dossier\_medical.py
│   │   ├── consultation.py
│   │   ├── soins.py
│   │   ├── delegation.py
│   │   └── logs.py
│   └── routes/                  # Endpoints de l'API
│       ├── auth.py
│       ├── admin.py
│       ├── dossier\_medical.py
│       ├── consultation.py
│       ├── urgence.py
│       ├── soins.py
│       ├── patient.py
│       ├── dashboard.py
│       └── delegation.py
├── create\_admin.py               # Script de création du premier compte (mot de passe via .env)
├── requirements.txt
├── .env                           # Non versionné
└── .gitignore
```

> Un fichier `app/kafka\_consumer\_test.py` peut exister localement pour la validation manuelle des événements Kafka — c'est un script de test, volontairement non versionné.

## Sécurité

* Mots de passe hashés avec bcrypt, jamais stockés en clair
* Clé de signature JWT et mot de passe du premier compte admin lus depuis `.env`, jamais codés en dur dans le dépôt
* Tokens JWT signés avec expiration (2h par défaut)
* Chaque action sensible (recherche NPI, création, accès urgence, délégation) est tracée dans `audit\_logs`, une table Append-Only : aucune suppression ni modification possible
* Différenciation stricte des permissions par rôle (`require\_role`)
* Isolation des données patient : un compte `patient` ne peut consulter que son propre dossier (rattaché via `npi\_patient`)

## Équipe

* BANGANA C. K. Landry
* BIAOU Fred
* LOKOSSOU Mélissa
* MEVO Divine I. H.
* OGA Baba-Tunde K. 0. Précieux
* PATINVOH Mavic
* HOUNGBEDJI Carlos
* VIOU Merveil Nathanael
* ZANNOU Freddy

\---

*Projet réalisé dans le cadre du cours NoSQL — Architecture polyglotte SQL + NoSQL/FHIR.*

