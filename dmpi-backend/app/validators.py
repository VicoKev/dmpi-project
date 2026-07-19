"""Validateurs Pydantic partagés entre plusieurs schémas."""
import re

_TELEPHONE_BENIN_RE = re.compile(r"^\+22901\d{8}$")


def normaliser_telephone_benin(v: str) -> str:
    """
    Valide et normalise un numéro de téléphone béninois au nouveau format
    national (en vigueur depuis fin 2024) : indicatif +229, suivi de
    exactement 10 chiffres commençant par 01 (8 chiffres après le préfixe
    01). Accepte des espaces/tirets/points en saisie, les retire à la
    normalisation pour un stockage cohérent (+22901XXXXXXXX, sans séparateurs).
    """
    nettoye = re.sub(r"[\s\-.]", "", v.strip())
    if not _TELEPHONE_BENIN_RE.match(nettoye):
        raise ValueError(
            "Le numéro doit être au format béninois : +229 01 suivi de 8 chiffres "
            "(10 chiffres au total après l'indicatif +229)."
        )
    return nettoye
