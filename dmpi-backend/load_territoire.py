"""
Charge le découpage territorial du Bénin (département > commune > arrondissement > quartier)
dans PostgreSQL à partir de decoupage_territorial_benin.sql (dump MySQL).

Appelé automatiquement par migrer.py au démarrage du conteneur si la table
'departement' est vide. Rechargement manuel possible avec :
docker exec dmpi-fastapi python load_territoire.py

Idempotent : chaque table est droppée puis recréée (DROP TABLE IF EXISTS en tête de dump),
donc le script peut être relancé sans effet de bord.
"""
import asyncio
import re
from pathlib import Path

import asyncpg

from app.database_sql import POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB

DUMP_PATH = Path(__file__).parent / "decoupage_territorial_benin.sql"


def _vers_sql_postgres(brut: str) -> str:
    """Adapte la syntaxe MySQL du dump vers un SQL compatible PostgreSQL."""
    sql = brut.replace("\r\n", "\n")
    sql = sql.replace("`", "")
    sql = re.sub(r"INT\(\d+\)", "INTEGER", sql)
    sql = re.sub(r"\s*ENGINE=InnoDB", "", sql)
    # Réexécutions idempotentes : les FK entre ces tables empêchent un DROP
    # simple si les tables dépendantes existent déjà d'un run précédent.
    sql = re.sub(r"(DROP TABLE IF EXISTS \w+)\s*;", r"\1 CASCADE;", sql)

    def _titrer(m: re.Match) -> str:
        id_part, label, tail = m.group(1), m.group(2), m.group(3) or ""
        libelle = label.replace("''", "'").title().replace("'", "''")
        return f"({id_part}, '{libelle}'{tail})"

    sql = re.sub(r"\((\d+),\s*'((?:[^']|'')*)'(,\s*\d+)?\)", _titrer, sql)
    return sql


async def charger_territoire() -> None:
    sql = _vers_sql_postgres(DUMP_PATH.read_text(encoding="utf-8"))

    # asyncpg via SQLAlchemy passe toujours par des prepared statements, qui
    # n'acceptent qu'une seule commande : on utilise donc une connexion brute
    # (protocole "simple query") pour exécuter ce script multi-commandes.
    conn = await asyncpg.connect(
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        database=POSTGRES_DB,
    )
    try:
        await conn.execute(sql)
    finally:
        await conn.close()

    print("✓ Découpage territorial chargé (12 départements, 77 communes, 546 arrondissements, 5304 quartiers).")


if __name__ == "__main__":
    asyncio.run(charger_territoire())
