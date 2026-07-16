import math


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance à vol d'oiseau entre deux points (formule de Haversine), en kilomètres.
    Approximation suffisante pour trier des candidats proches — ne reflète pas
    la distance routière réelle."""
    rayon_terre_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    return rayon_terre_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
