from slowapi import Limiter
from slowapi.util import get_remote_address

# Stockage en mémoire (process unique en déploiement actuel) — suffisant tant
# qu'il n'y a qu'une seule instance du backend ; à passer sur Redis si le
# backend est un jour répliqué sur plusieurs instances.
limiter = Limiter(key_func=get_remote_address)
