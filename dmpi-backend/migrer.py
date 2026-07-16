"""
Applique les migrations Alembic au démarrage du conteneur (voir entrypoint.sh).

Gère un cas particulier : une base créée AVANT l'introduction d'Alembic dans
ce projet (via l'ancien Base.metadata.create_all) possède déjà toutes les
tables applicatives, mais aucune table `alembic_version` pour le prouver.
Dans ce cas, `alembic upgrade head` échouerait en tentant de recréer des
tables déjà existantes ("relation already exists"). On détecte ce cas et on
se contente de marquer la base à la révision actuelle (`stamp`) avant de
poursuivre — aucune donnée n'est touchée, seul l'état de suivi Alembic est
initialisé.

Sur une base neuve (ni tables ni suivi Alembic), le comportement est
inchangé : `alembic upgrade head` crée tout le schéma normalement.
"""
import asyncio

from alembic.config import Config
from alembic import command
from sqlalchemy import inspect

from app.database_sql import engine


async def _etat_base() -> tuple[bool, bool]:
    """Retourne (a_des_tables_applicatives, a_un_suivi_alembic)."""
    async with engine.connect() as conn:
        def _inspecter(sync_conn):
            insp = inspect(sync_conn)
            return insp.has_table("users"), insp.has_table("alembic_version")
        return await conn.run_sync(_inspecter)


def main() -> None:
    a_des_tables, a_un_suivi = asyncio.run(_etat_base())
    config = Config("alembic.ini")

    if a_des_tables and not a_un_suivi:
        print("[migrer] Base pré-Alembic détectée (tables existantes, aucun suivi de version) "
              "— marquage à la révision actuelle sans exécuter le DDL.")
        command.stamp(config, "head")

    command.upgrade(config, "head")


if __name__ == "__main__":
    main()
