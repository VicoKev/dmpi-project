// Page "En construction" pour la démo
import { useLocation } from "react-router";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

export default function WipPage() {
  const location = useLocation();
  const path = location.pathname.split("/").pop();
  
  // Format the title based on the path
  const title = path 
    ? path.charAt(0).toUpperCase() + path.slice(1).replace("-", " ") 
    : "Module";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
      <Card variant="glass" className="max-w-md w-full text-center p-8 flex flex-col items-center gap-4">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mb-2"
          style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary-container)" }}
        >
          <span className="material-symbols-outlined text-4xl">construction</span>
        </div>
        
        <h1 className="text-headline-sm" style={{ color: "var(--color-primary)" }}>
          {title}
        </h1>
        
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Ce module est actuellement en cours de développement. Il sera disponible dans une prochaine version de la plateforme DMPI.
        </p>

        <div className="mt-4">
          <Button variant="outline" icon="arrow_back" onClick={() => window.history.back()}>
            Retour
          </Button>
        </div>
      </Card>
    </div>
  );
}
