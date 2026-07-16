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

Charge aussi automatiquement le découpage territorial du Bénin (via
load_territoire.py) si la table `departement` — créée par Alembic mais
jamais peuplée par lui — est vide. Ce chargement est un DDL+DML séparé
d'Alembic (dump SQL brut, pas de modèle géré par migration) : sans cette
vérification, la table reste silencieusement vide sur un nouveau clone.
"""
import asyncio

from alembic.config import Config
from alembic import command
from sqlalchemy import inspect, text

from app.database_sql import engine
from load_territoire import charger_territoire


async def _etat_base() -> tuple[bool, bool]:
    """Retourne (a_des_tables_applicatives, a_un_suivi_alembic)."""
    async with engine.connect() as conn:
        def _inspecter(sync_conn):
            insp = inspect(sync_conn)
            return insp.has_table("users"), insp.has_table("alembic_version")
        resultat = await conn.run_sync(_inspecter)
    # `engine` est un module global réutilisé par un second `asyncio.run()`
    # plus bas (_territoire_vide) : sans dispose, son pool asyncpg reste lié
    # à la boucle d'événements de CET appel-ci, qui va se fermer avec lui,
    # et le second appel plante avec "attached to a different loop".
    await engine.dispose()
    return resultat


async def _territoire_vide() -> bool:
    """Vrai si la table `departement` ne contient aucune ligne (elle existe
    déjà à ce stade, créée par `alembic upgrade head`)."""
    async with engine.connect() as conn:
        resultat = await conn.execute(text("SELECT COUNT(*) FROM departement"))
        return resultat.scalar() == 0


def main() -> None:
    a_des_tables, a_un_suivi = asyncio.run(_etat_base())
    config = Config("alembic.ini")

    if a_des_tables and not a_un_suivi:
        print("[migrer] Base pré-Alembic détectée (tables existantes, aucun suivi de version) "
              "— marquage à la révision actuelle sans exécuter le DDL.")
        command.stamp(config, "head")

    command.upgrade(config, "head")

    if asyncio.run(_territoire_vide()):
        print("[migrer] Découpage territorial absent — chargement automatique...")
        asyncio.run(charger_territoire())


if __name__ == "__main__":
    main()
