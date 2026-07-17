"""
Stockage des fichiers de documents médicaux (radiographies, scanners, résultats
de laboratoire) sur le disque du conteneur backend, dans un volume Docker dédié
(voir docker-compose.yml : service `backend`, volume `uploads`).

Toute la logique de lecture/écriture disque passe par ce module plutôt que
d'être dispersée dans les routes — si le projet migre un jour vers un stockage
cloud (Cloudinary, S3...), seul ce fichier a besoin d'être réécrit.
"""
import io
import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

TAILLE_MAX_OCTETS = 10 * 1024 * 1024  # 10 Mo
TAILLE_VIGNETTE = (300, 300)

# Signatures binaires ("magic bytes") — on ne fait jamais confiance au
# Content-Type déclaré par le client, qui peut être falsifié.
_SIGNATURES: dict[bytes, str] = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"%PDF-": "application/pdf",
}


def _detecter_type_reel(contenu: bytes) -> str | None:
    for signature, type_mime in _SIGNATURES.items():
        if contenu.startswith(signature):
            return type_mime
    return None


async def _lire_borne(upload: UploadFile, taille_max: int) -> bytes:
    """Lit le fichier par blocs et interrompt dès que la limite est dépassée,
    plutôt que de charger un fichier potentiellement énorme en mémoire d'un coup."""
    donnees = bytearray()
    while True:
        bloc = await upload.read(1024 * 1024)
        if not bloc:
            break
        donnees.extend(bloc)
        if len(donnees) > taille_max:
            raise HTTPException(
                status_code=413,
                detail=f"« {upload.filename} » dépasse la taille maximale autorisée ({taille_max // (1024 * 1024)} Mo)."
            )
    return bytes(donnees)


def _generer_vignette(contenu_image: bytes, destination: Path) -> bool:
    try:
        image = Image.open(io.BytesIO(contenu_image))
        image.thumbnail(TAILLE_VIGNETTE)
        # JPEG ne supporte aucun canal alpha — plutôt que d'énumérer les modes
        # problématiques (RGBA, LA, P avec transparence...), on convertit
        # systématiquement en RGB, seul mode garanti compatible.
        if image.mode != "RGB":
            image = image.convert("RGB")
        image.save(destination, "JPEG", quality=70)
        return True
    except Exception:
        # Une image corrompue ne doit pas empêcher l'enregistrement du fichier
        # original — la vignette est un confort d'affichage, pas une garantie.
        return False


async def sauvegarder_fichier(upload: UploadFile) -> dict:
    """
    Valide et enregistre un fichier uploadé sur le disque.
    Retourne les métadonnées à stocker en base (jamais le nom original tel
    quel comme chemin, pour éviter tout path traversal).
    """
    contenu = await _lire_borne(upload, TAILLE_MAX_OCTETS)
    if not contenu:
        raise HTTPException(status_code=400, detail=f"« {upload.filename} » est vide.")

    type_reel = _detecter_type_reel(contenu)
    if type_reel is None:
        raise HTTPException(
            status_code=400,
            detail=f"« {upload.filename} » n'est pas un fichier JPEG, PNG ou PDF valide."
        )

    identifiant = str(uuid.uuid4())
    extension = {"image/jpeg": ".jpg", "image/png": ".png", "application/pdf": ".pdf"}[type_reel]
    chemin_stockage = f"{identifiant}{extension}"
    (UPLOAD_DIR / chemin_stockage).write_bytes(contenu)

    vignette_chemin = None
    if type_reel in ("image/jpeg", "image/png"):
        chemin_vignette = f"{identifiant}_vignette.jpg"
        if _generer_vignette(contenu, UPLOAD_DIR / chemin_vignette):
            vignette_chemin = chemin_vignette

    return {
        "nom_original": upload.filename or "fichier",
        "type_mime": type_reel,
        "taille_octets": len(contenu),
        "chemin_stockage": chemin_stockage,
        "vignette_chemin": vignette_chemin,
    }


def chemin_absolu(chemin_stockage: str) -> Path:
    """Résout un chemin_stockage relatif vers son emplacement réel sur le
    disque, sans jamais laisser le nom fourni traverser hors de UPLOAD_DIR."""
    chemin = (UPLOAD_DIR / chemin_stockage).resolve()
    if UPLOAD_DIR.resolve() not in chemin.parents and chemin != UPLOAD_DIR.resolve():
        raise HTTPException(status_code=400, detail="Chemin de fichier invalide.")
    return chemin


def supprimer_fichier(chemin_stockage: str) -> None:
    chemin = chemin_absolu(chemin_stockage)
    chemin.unlink(missing_ok=True)
