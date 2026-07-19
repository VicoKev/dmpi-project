// Format national béninois en vigueur depuis fin 2024 : +229 suivi de 10 chiffres
// commençant par 01 (8 chiffres après le préfixe 01). Miroir de la validation
// backend (app/validators.py::normaliser_telephone_benin).
const TELEPHONE_BENIN_RE = /^\+22901\d{8}$/;

export const TELEPHONE_BENIN_PLACEHOLDER = "+22901XXXXXXXX";
export const TELEPHONE_BENIN_HINT =
  "Format béninois requis : +229 01 suivi de 8 chiffres (10 chiffres après l'indicatif).";

export function nettoyerTelephone(v: string): string {
  return v.trim().replace(/[\s\-.]/g, "");
}

export function validateTelephoneBenin(v: string): boolean {
  return TELEPHONE_BENIN_RE.test(nettoyerTelephone(v));
}
