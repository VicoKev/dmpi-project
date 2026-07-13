from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv
from urllib.parse import quote_plus
import os

load_dotenv()

POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "dmpi_db")

# Vérifier que le mot de passe n'est pas None avant de l'encoder
if POSTGRES_PASSWORD:
    ENCODED_PASSWORD = quote_plus(POSTGRES_PASSWORD)
else:
    ENCODED_PASSWORD = ""

DATABASE_URL = f"postgresql+asyncpg://{POSTGRES_USER}:{ENCODED_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"ssl": False},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_sql_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()