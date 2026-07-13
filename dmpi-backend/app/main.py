from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.context import client_ip
from app.database_mongo import database as mongo_database
from app.database_sql import engine, Base
from app import models_sql
from app.routes.dossier_medical import router as dossier_router
from app.routes.consultation import router as consultation_router
from app.routes.ordonnance import router as ordonnance_router
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.urgence import router as urgence_router
from app.routes.soins import router as soins_router
from app.routes.patient import router as patient_router
from app.routes.delegation import router as delegation_router
from app.routes.dashboard import router as dashboard_router
from app.routes.rdv import router as rdv_router
from app.routes.etablissement import router as etablissement_router
from app.kafka_producer import demarrer_producer, arreter_producer

app = FastAPI(
    title="DMPI - Dossier Medical Partage Interoperable du Benin",
    description="API Backend pour le projet DMPI - Architecture Polyglotte (SQL + NoSQL/FHIR)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, spécifier les domaines autorisés
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def capture_client_ip(request: Request, call_next):
    """
    Middleware qui intercepte chaque requête entrante pour lire l'adresse IP.
    Stocke cette IP dans un ContextVar pour qu'elle soit accessible globalement
    dans le contexte de cette requête unique, sans avoir à la passer en paramètre.
    """
    ip = request.client.host if request.client else None
    client_ip.set(ip)
    return await call_next(request)


@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await demarrer_producer()

@app.on_event("shutdown")
async def shutdown_event():
    await arreter_producer()

app.include_router(dossier_router)
app.include_router(consultation_router)
app.include_router(ordonnance_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(urgence_router)
app.include_router(soins_router)
app.include_router(patient_router)
app.include_router(delegation_router)
app.include_router(dashboard_router)
app.include_router(rdv_router)
app.include_router(etablissement_router)

@app.get("/")
async def root():
    return {
        "projet": "DMPI - Bénin",
        "statut": "API opérationnelle",
        "etape": "Développement MVP - Hybride SQL/NoSQL"
    }

@app.get("/health/mongo")
async def check_mongo_connection():
    try:
        await mongo_database.list_collection_names()
        return {"status": "success", "message": "Connexion à MongoDB réussie !"}
    except Exception as e:
        return {"status": "error", "message": "Échec MongoDB", "details": str(e)}