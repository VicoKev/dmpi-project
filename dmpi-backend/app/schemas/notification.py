from pydantic import BaseModel


class ElementNotification(BaseModel):
    cle: str
    titre: str
    compte: int
    lien: str
    icone: str
    urgence: str  # "info" | "warning" | "error"


class NotificationsResponse(BaseModel):
    total: int
    elements: list[ElementNotification]
