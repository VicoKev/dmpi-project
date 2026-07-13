import asyncio
from datetime import datetime, timedelta
from app.database_sql import AsyncSessionLocal
from app.models_sql import User
from sqlalchemy import select, update
from app.database_mongo import (
    dossiers_medicaux_collection,
    consultations_collection,
    constantes_vitales_collection,
    administrations_collection
)

async def seed_data():
    # 1. Update PostgreSQL Patient to have an NPI
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(User)
            .where(User.email == "patient@dmpi.bj")
            .values(npi_patient="1234567890")
        )
        await db.commit()
        print("Updated patient@dmpi.bj with NPI 1234567890")

    # 2. Clear MongoDB to avoid duplicates
    await dossiers_medicaux_collection.delete_many({"npi": "1234567890"})
    await consultations_collection.delete_many({"npi": "1234567890"})
    await constantes_vitales_collection.delete_many({"npi": "1234567890"})
    await administrations_collection.delete_many({"npi": "1234567890"})

    # 3. Create Dossier Medical
    dossier = {
        "npi": "1234567890",
        "groupe_sanguin": "O+",
        "allergies": [
            {
                "substance": "Pénicilline",
                "severite": "Haute",
                "notes": "Choc anaphylactique en 2015"
            }
        ],
        "antecedents": ["Hypertension artérielle", "Appendicectomie (2010)"],
        "traitements_en_cours": [
            {
                "nom_medicament": "Amlodipine 5mg",
                "posologie": "1 comprimé le matin",
                "indication": "Hypertension"
            }
        ],
        "updated_at": datetime.utcnow()
    }
    await dossiers_medicaux_collection.insert_one(dossier)
    print("Dossier médical inséré.")

    # 4. Create Consultations
    consultation = {
        "npi": "1234567890",
        "motif": "Fièvre et toux persistante depuis 3 jours",
        "diagnostic_cim10": "J06.9 - Infection aigue des voies respiratoires supérieures, sans précision",
        "conclusion": "Infection virale présumée. Repos et traitement symptomatique.",
        "ordonnance": {
            "traitements": [
                {
                    "nom_medicament": "Paracétamol 1000mg",
                    "posologie": "1 comprimé toutes les 8h si fièvre",
                    "duree": "3 jours"
                },
                {
                    "nom_medicament": "Sirop antitussif",
                    "posologie": "1 cuillère à soupe matin, midi et soir",
                    "duree": "5 jours"
                }
            ],
            "notes_additionnelles": "Boire beaucoup d'eau. Revenir si les symptômes persistent après 3 jours."
        },
        "created_at": datetime.utcnow() - timedelta(days=2)
    }
    result = await consultations_collection.insert_one(consultation)
    consultation_id = str(result.inserted_id)
    print(f"Consultation insérée (ID: {consultation_id}).")

    # 5. Create Constantes Vitales
    constantes = [
        {
            "npi": "1234567890",
            "tension_arterielle": "125/80",
            "pouls": 78,
            "temperature": 37.2,
            "saturation_oxygene": 98,
            "notes": "Patient calme, pas de douleur thoracique.",
            "releve_par": "inf.mensah@cnhu-cotonou.bj",
            "created_at": datetime.utcnow() - timedelta(days=5)
        },
        {
            "npi": "1234567890",
            "tension_arterielle": "140/90",
            "pouls": 85,
            "temperature": 38.5,
            "saturation_oxygene": 97,
            "notes": "Fièvre modérée, céphalées.",
            "releve_par": "inf.mensah@cnhu-cotonou.bj",
            "created_at": datetime.utcnow() - timedelta(days=2)
        }
    ]
    await constantes_vitales_collection.insert_many(constantes)
    print("Constantes vitales insérées.")

    # 6. Create Administration Traitement
    admin_traitement = {
        "npi": "1234567890",
        "consultation_id": consultation_id,
        "nom_medicament": "Paracétamol 1000mg",
        "administre_par": "inf.mensah@cnhu-cotonou.bj",
        "horodatage": datetime.utcnow() - timedelta(days=1, hours=10)
    }
    await administrations_collection.insert_one(admin_traitement)
    print("Administration de traitement insérée.")
    
    print("Génération de données terminée avec succès !")

if __name__ == "__main__":
    asyncio.run(seed_data())
