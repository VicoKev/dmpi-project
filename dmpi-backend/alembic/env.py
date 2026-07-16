import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from app.database_sql import Base, DATABASE_URL
from app import models_sql  # noqa: F401 — enregistre tous les modèles sur Base.metadata

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# L'URL de connexion vient des mêmes variables d'environnement que le reste de
# l'app (voir app/database_sql.py), pas d'un secret dupliqué dans alembic.ini.
#
# set_main_option() passe par configparser, qui interprète nativement tout "%"
# comme le début d'une référence d'interpolation (ex "%(name)s") — un mot de
# passe contenant un caractère spécial (@, :, /, %...) est correctement
# pourcenté-encodé par quote_plus() dans database_sql.py (ex "@" -> "%40"),
# mais ce "%40" fait alors planter configparser avec "invalid interpolation
# syntax". On échappe donc "%" en "%%" uniquement pour cet appel : la valeur
# stockée puis relue par Alembic reste la bonne URL, "%%" n'étant qu'un
# artefact de la syntaxe d'échappement de configparser.
config.set_main_option("sqlalchemy.url", DATABASE_URL.replace("%", "%%"))

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
