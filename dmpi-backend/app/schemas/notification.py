from pydantic import BaseModel


class ElementNotification(BaseModel):
    cle: str
    titre: str
    compte: int
    lien: str
    icone: str
    urgence: str  # "info" | "warning" | "error"
    # Vrai uniquement pour les notifications purement informatives (voir
    # CLES_MARQUABLES_VUES) — les autres signalent une action encore non
    # faite et ne doivent disparaître qu'une fois le problème réellement résolu.
    peut_marquer_vu: bool = False


class NotificationsResponse(BaseModel):
    total: int
    elements: list[ElementNotification]


class MarquerNotificationVueRequest(BaseModel):
    cle: str
