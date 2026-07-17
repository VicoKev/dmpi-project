// Login Screen — DMPI
import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import type { AuthError } from "../services/authService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // URL pour rediriger l'utilisateur après login (s'il venait d'une URL protégée)
  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    try {
      const defaultRoute = await login({ email, password });
      navigate(from || defaultRoute, { replace: true });
    } catch (err) {
      const e = err as AuthError;
      setError(e.message || "Une erreur est survenue lors de la connexion.");
    }
  };

  // Remplissage rapide pour dev (à retirer en prod)
  const fillCredentials = (role: string) => {
    switch (role) {
      case "medecin":
        setEmail("dr.kouassi@dmpi.bj");
        setPassword("Medecin2025!");
        break;
      case "infirmier":
        setEmail("inf.mensah@dmpi.bj");
        setPassword("Infirmier2025!");
        break;
      case "patient":
        setEmail("patient.dossou@dmpi.bj");
        setPassword("Patient2025!");
        break;
      case "admin":
        setEmail("admin.cnhu@dmpi.bj");
        setPassword("Admin2025!");
        break;
      case "superadmin":
        setEmail("superadmin@dmpi.bj");
        setPassword("Admin2025!");
        break;
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-primary-container)] flex flex-col items-center justify-center relative overflow-hidden px-5">
      {/* Image de fond avec overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0" 
        style={{ backgroundImage: 'url("/images/login_bg.webp")' }}
      >
        <div className="absolute inset-0 bg-[var(--color-primary-container)] opacity-80 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-primary)] via-transparent to-transparent opacity-90"></div>
      </div>

      <div className="z-10 w-full max-w-md flex flex-col items-center gap-8 animate-fade-in-up">
        {/* En-tête / Logo */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg relative animate-pulse-ring">
            <span
              className="material-symbols-outlined text-5xl"
              style={{ color: "var(--color-primary-container)", fontVariationSettings: "'FILL' 1" }}
            >
              medical_services
            </span>
          </div>
          <div>
            <h1 className="text-headline-lg text-white mb-2">DMPI Bénin</h1>
            <p className="text-body-md text-[var(--color-on-primary-container)] opacity-90">
              Dossier Médical Partagé Interopérable
            </p>
          </div>
        </div>

        {/* Formulaire */}
        <Card variant="glass" className="w-full p-6 sm:p-8 animate-slide-down delay-200">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <h2 className="text-headline-sm text-center" style={{ color: "var(--color-primary)" }}>
              Connexion
            </h2>

            {error && (
              <div
                className="p-3 rounded-lg flex items-start gap-2 text-body-md"
                style={{
                  backgroundColor: "var(--color-error-container)",
                  color: "var(--color-on-error-container)",
                }}
              >
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <Input
                label="Adresse email"
                type="email"
                placeholder="prenom.nom@hopital.bj"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leadingIcon="mail"
                required
              />
              
              <Input
                label="Mot de passe"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leadingIcon="lock"
                required
              />
            </div>

            <Button type="submit" fullWidth loading={isLoading} size="lg">
              Se connecter
            </Button>
          </form>

          {/* Dev Only : Boutons de remplissage rapide — retirés du bundle de production */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-[var(--color-outline-variant)]">
              <p className="text-caption text-center mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
                Dev Only - Remplissage rapide
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fillCredentials("medecin")} type="button">Médecin</Button>
                <Button variant="outline" size="sm" onClick={() => fillCredentials("infirmier")} type="button">Infirmier</Button>
                <Button variant="outline" size="sm" onClick={() => fillCredentials("patient")} type="button">Patient</Button>
                <Button variant="outline" size="sm" onClick={() => fillCredentials("admin")} type="button">Admin</Button>
                <Button variant="outline" size="sm" onClick={() => fillCredentials("superadmin")} type="button">Superadmin</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
