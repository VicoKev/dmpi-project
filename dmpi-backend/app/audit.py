import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.models_sql import AuditLog
from app.database_sql import AsyncSessionLocal
from datetime import datetime
from app.context import client_ip

logger = logging.getLogger(__name__)

async def enregistrer_log(
    utilisateur_email: str,
    action: str,
    statut_action: str,
    npi_concerne: str | None = None
):
    """
    Enregistre une entrée immuable dans le journal d'audit PostgreSQL.
    Utilise sa propre session pour ne jamais bloquer la requête principale
    même si le log échoue.
    """
    ip = client_ip.get()
    try:
        async with AsyncSessionLocal() as db:
            log = AuditLog(
                utilisateur_email=utilisateur_email,
                action=action,
                npi_concerne=npi_concerne,
                statut_action=statut_action,
                horodatage=datetime.utcnow(),
                adresse_ip=ip

            )
            db.add(log)
            await db.commit()
    except Exception as e:
        # Le logging ne doit jamais faire planter la requête principale.
        logger.error("Erreur lors de l'écriture du log d'audit : %s", e)