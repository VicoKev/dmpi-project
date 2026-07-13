// Service CIM-10 — Base locale (~120 codes courants en Afrique de l'Ouest)
import type { Cim10Code } from "../types/consultation";

const CIM10_DATABASE: Cim10Code[] = [
  // Maladies endocriniennes et métaboliques
  { code: "E10", libelle: "Diabète sucré de type 1", chapitre: "Maladies endocriniennes" },
  { code: "E11", libelle: "Diabète sucré de type 2", chapitre: "Maladies endocriniennes" },
  { code: "E14", libelle: "Diabète sucré, sans précision", chapitre: "Maladies endocriniennes" },
  { code: "E66", libelle: "Obésité", chapitre: "Maladies endocriniennes" },
  { code: "E50", libelle: "Carence en vitamine A", chapitre: "Maladies endocriniennes" },
  { code: "E64", libelle: "Séquelles de malnutrition", chapitre: "Maladies endocriniennes" },

  // Maladies cardiovasculaires
  { code: "I10", libelle: "Hypertension essentielle (primaire)", chapitre: "Appareil circulatoire" },
  { code: "I11", libelle: "Cardiopathie hypertensive", chapitre: "Appareil circulatoire" },
  { code: "I20", libelle: "Angine de poitrine", chapitre: "Appareil circulatoire" },
  { code: "I21", libelle: "Infarctus aigu du myocarde", chapitre: "Appareil circulatoire" },
  { code: "I50", libelle: "Insuffisance cardiaque", chapitre: "Appareil circulatoire" },
  { code: "I63", libelle: "Infarctus cérébral", chapitre: "Appareil circulatoire" },
  { code: "I64", libelle: "Accident vasculaire cérébral sans précision", chapitre: "Appareil circulatoire" },
  { code: "I83", libelle: "Varices des membres inférieurs", chapitre: "Appareil circulatoire" },

  // Maladies respiratoires
  { code: "J00", libelle: "Rhinopharyngite aiguë (rhume banal)", chapitre: "Appareil respiratoire" },
  { code: "J06.9", libelle: "Infection aiguë des voies respiratoires supérieures, sans précision", chapitre: "Appareil respiratoire" },
  { code: "J18", libelle: "Pneumopathie, sans précision", chapitre: "Appareil respiratoire" },
  { code: "J20", libelle: "Bronchite aiguë", chapitre: "Appareil respiratoire" },
  { code: "J45", libelle: "Asthme", chapitre: "Appareil respiratoire" },
  { code: "J22", libelle: "Infection aiguë des voies respiratoires inférieures, sans précision", chapitre: "Appareil respiratoire" },
  { code: "J98.9", libelle: "Trouble respiratoire, sans précision", chapitre: "Appareil respiratoire" },

  // Maladies infectieuses (tropicales)
  { code: "A00", libelle: "Choléra", chapitre: "Maladies infectieuses" },
  { code: "A01", libelle: "Fièvres typhoïde et paratyphoïde", chapitre: "Maladies infectieuses" },
  { code: "A06", libelle: "Amibiase", chapitre: "Maladies infectieuses" },
  { code: "A09", libelle: "Diarrhée et gastro-entérite d'origine infectieuse présumée", chapitre: "Maladies infectieuses" },
  { code: "A15", libelle: "Tuberculose respiratoire", chapitre: "Maladies infectieuses" },
  { code: "A59", libelle: "Trichomonase", chapitre: "Maladies infectieuses" },
  { code: "B50", libelle: "Paludisme à Plasmodium falciparum", chapitre: "Maladies parasitaires" },
  { code: "B53", libelle: "Autres formes de paludisme confirmées par examen parasitologique", chapitre: "Maladies parasitaires" },
  { code: "B54", libelle: "Paludisme, sans précision", chapitre: "Maladies parasitaires" },
  { code: "B20", libelle: "Maladie due au VIH entraînant des maladies infectieuses et parasitaires", chapitre: "Maladies infectieuses" },
  { code: "B24", libelle: "Maladie due au VIH, sans précision", chapitre: "Maladies infectieuses" },
  { code: "B37", libelle: "Candidose", chapitre: "Maladies infectieuses" },
  { code: "B77", libelle: "Ascaridiose", chapitre: "Maladies parasitaires" },

  // Maladies digestives
  { code: "K29.7", libelle: "Gastrite, sans précision", chapitre: "Appareil digestif" },
  { code: "K21", libelle: "Maladie de reflux gastro-oesophagien", chapitre: "Appareil digestif" },
  { code: "K40", libelle: "Hernie inguinale", chapitre: "Appareil digestif" },
  { code: "K70", libelle: "Maladie alcoolique du foie", chapitre: "Appareil digestif" },
  { code: "K74", libelle: "Fibrose et cirrhose hépatiques", chapitre: "Appareil digestif" },
  { code: "K80", libelle: "Lithiase biliaire", chapitre: "Appareil digestif" },
  { code: "K90", libelle: "Malabsorption intestinale", chapitre: "Appareil digestif" },

  // Maladies génitourinaires
  { code: "N18", libelle: "Maladie rénale chronique", chapitre: "Appareil génito-urinaire" },
  { code: "N39.0", libelle: "Infection des voies urinaires, siège non précisé", chapitre: "Appareil génito-urinaire" },
  { code: "N40", libelle: "Hyperplasie bénigne de la prostate", chapitre: "Appareil génito-urinaire" },

  // Obstétrique
  { code: "O10", libelle: "Hypertension préexistante compliquant la grossesse", chapitre: "Grossesse" },
  { code: "O14", libelle: "Hypertension gravidique avec protéinurie significative", chapitre: "Grossesse" },
  { code: "O24", libelle: "Diabète sucré survenant au cours de la grossesse", chapitre: "Grossesse" },
  { code: "O80", libelle: "Accouchement spontané par le siège", chapitre: "Grossesse" },

  // Maladies du sang
  { code: "D50", libelle: "Anémie par carence en fer", chapitre: "Maladies du sang" },
  { code: "D51", libelle: "Anémie par carence en vitamine B12", chapitre: "Maladies du sang" },
  { code: "D57", libelle: "Troubles dus à la drépanocytose", chapitre: "Maladies du sang" },
  { code: "D64", libelle: "Autres anémies", chapitre: "Maladies du sang" },

  // Maladies musculo-squelettiques
  { code: "M10", libelle: "Goutte", chapitre: "Appareil locomoteur" },
  { code: "M19", libelle: "Autres arthropathies", chapitre: "Appareil locomoteur" },
  { code: "M54.5", libelle: "Lombalgie basse", chapitre: "Appareil locomoteur" },
  { code: "M79.3", libelle: "Panniculite", chapitre: "Appareil locomoteur" },

  // Maladies de la peau
  { code: "L20", libelle: "Dermatite atopique", chapitre: "Peau et tissu cellulaire" },
  { code: "L50", libelle: "Urticaire", chapitre: "Peau et tissu cellulaire" },
  { code: "L60.0", libelle: "Ongle incarné", chapitre: "Peau et tissu cellulaire" },

  // Maladies neurologiques
  { code: "G35", libelle: "Sclérose en plaques", chapitre: "Système nerveux" },
  { code: "G40", libelle: "Épilepsie", chapitre: "Système nerveux" },
  { code: "G43", libelle: "Migraine", chapitre: "Système nerveux" },
  { code: "G47.0", libelle: "Troubles de l'endormissement et du maintien du sommeil", chapitre: "Système nerveux" },

  // Santé mentale
  { code: "F32", libelle: "Épisode dépressif", chapitre: "Troubles mentaux" },
  { code: "F41", libelle: "Autres troubles anxieux", chapitre: "Troubles mentaux" },
  { code: "F20", libelle: "Schizophrénie", chapitre: "Troubles mentaux" },

  // Traumatismes et blessures
  { code: "S00", libelle: "Traumatisme superficiel de la tête", chapitre: "Traumatismes" },
  { code: "S72", libelle: "Fracture du fémur", chapitre: "Traumatismes" },
  { code: "T14.0", libelle: "Plaie d'une région non précisée du corps", chapitre: "Traumatismes" },

  // Néoplasmes
  { code: "C22", libelle: "Tumeur maligne du foie", chapitre: "Néoplasmes" },
  { code: "C34", libelle: "Tumeur maligne des bronches et du poumon", chapitre: "Néoplasmes" },
  { code: "C50", libelle: "Tumeur maligne du sein", chapitre: "Néoplasmes" },

  // Ophtalmologie
  { code: "H10", libelle: "Conjonctivite", chapitre: "Œil et ses annexes" },
  { code: "H26", libelle: "Autres cataractes", chapitre: "Œil et ses annexes" },
  { code: "H40", libelle: "Glaucome", chapitre: "Œil et ses annexes" },

  // ORL
  { code: "H60", libelle: "Otite externe", chapitre: "Oreille" },
  { code: "H66", libelle: "Otite moyenne suppurée et non précisée", chapitre: "Oreille" },
  { code: "J02", libelle: "Pharyngite aiguë", chapitre: "Appareil respiratoire" },
  { code: "J03", libelle: "Amygdalite aiguë", chapitre: "Appareil respiratoire" },
  { code: "J01", libelle: "Sinusite aiguë", chapitre: "Appareil respiratoire" },

  // Divers
  { code: "R50", libelle: "Fièvre d'étiologie inconnue", chapitre: "Symptômes" },
  { code: "R51", libelle: "Céphalée", chapitre: "Symptômes" },
  { code: "R05", libelle: "Toux", chapitre: "Symptômes" },
  { code: "R07", libelle: "Douleur du pharynx et de la poitrine", chapitre: "Symptômes" },
  { code: "R10", libelle: "Douleurs abdominales et pelviennes", chapitre: "Symptômes" },
  { code: "R55", libelle: "Syncope et collapsus", chapitre: "Symptômes" },
  { code: "Z00", libelle: "Examen médical général", chapitre: "Contact pour soins" },
];



export async function searchCim10(query: string): Promise<Cim10Code[]> {
  if (!query || query.trim().length < 2) return [];

  const q = query.toLowerCase().trim();
  return CIM10_DATABASE.filter(
    (code) =>
      code.code.toLowerCase().includes(q) ||
      code.libelle.toLowerCase().includes(q) ||
      (code.chapitre?.toLowerCase().includes(q) ?? false)
  ).slice(0, 10);
}

/**
 * Récupère un code CIM-10 exact par son code.
 */
export function getCim10ByCode(code: string): Cim10Code | undefined {
  return CIM10_DATABASE.find((c) => c.code === code);
}

export { CIM10_DATABASE };
