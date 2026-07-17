"""
Catalogue des types d'examens qu'un médecin peut prescrire à un laboratoire
partenaire — liste fermée plutôt que texte libre, pour éviter les doublons
et fautes de saisie (ex: "NFS" vs "N.F.S" vs "Numération formule sanguine").

Source unique de vérité côté backend : exposée au frontend via
GET /demandes-examen/types-disponibles, et utilisée pour valider toute
prescription entrante (voir schemas/demande_examen.py).
"""

TYPES_EXAMEN: dict[str, list[str]] = {
    "Biologie": [
        "Numération Formule Sanguine (NFS)",
        "Glycémie à jeun",
        "Hémoglobine glyquée (HbA1c)",
        "Bilan lipidique complet",
        "Créatininémie",
        "Urée sanguine",
        "Transaminases (ASAT/ALAT)",
        "Bilirubine totale et conjuguée",
        "CRP (Protéine C-réactive)",
        "Vitesse de sédimentation (VS)",
        "TSH (Thyréostimuline)",
        "Groupe sanguin ABO/Rhésus",
        "Test de dépistage VIH",
        "Sérologie hépatite B",
        "Sérologie hépatite C",
        "Goutte épaisse / Test de diagnostic rapide du paludisme",
        "Examen Cytobactériologique des Urines (ECBU)",
        "Coproculture / Examen parasitologique des selles",
        "Ionogramme sanguin",
        "Bilan de la coagulation (TP, TCA)",
        "Test de grossesse (bêta-hCG)",
        "Électrophorèse de l'hémoglobine",
        "Dosage de la ferritine",
        "Dosage de la PSA (antigène prostatique spécifique)",
    ],
    "Radiographie": [
        "Radiographie thoracique",
        "Radiographie du crâne",
        "Radiographie abdominale sans préparation",
        "Radiographie du rachis",
        "Radiographie des membres (os longs)",
        "Radiographie du bassin",
        "Radiographie dentaire (panoramique)",
    ],
    "Scanner": [
        "Scanner cérébral",
        "Scanner thoracique",
        "Scanner abdomino-pelvien",
        "Scanner du rachis",
        "Angioscanner",
    ],
    "Échographie": [
        "Échographie abdominale",
        "Échographie pelvienne",
        "Échographie obstétricale",
        "Échographie cardiaque (échocardiographie)",
        "Échographie rénale",
        "Échographie thyroïdienne",
        "Échographie des parties molles",
    ],
    "IRM": [
        "IRM cérébrale",
        "IRM du rachis",
        "IRM abdominale",
        "IRM ostéo-articulaire",
    ],
    "Cardiologie": [
        "Électrocardiogramme (ECG)",
        "Épreuve d'effort",
        "Holter ECG (24h)",
    ],
    "Anatomopathologie": [
        "Biopsie cutanée",
        "Biopsie ganglionnaire",
        "Frottis cervico-vaginal (dépistage)",
        "Examen anatomopathologique de pièce opératoire",
    ],
    "Autre": [
        "Audiométrie",
        "Spirométrie (Explorations Fonctionnelles Respiratoires)",
        "Fond d'œil",
        "Électroencéphalogramme (EEG)",
        "Autre (préciser dans le motif)",
    ],
}

TYPES_EXAMEN_VALIDES: set[str] = {
    libelle for libelles in TYPES_EXAMEN.values() for libelle in libelles
}
