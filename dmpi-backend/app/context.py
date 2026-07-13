import contextvars

# ContextVar pour stocker l'IP du client courant.
# Isolée par requête de manière native par l'event loop asyncio de FastAPI.
client_ip: contextvars.ContextVar[str | None] = contextvars.ContextVar("client_ip", default=None)
