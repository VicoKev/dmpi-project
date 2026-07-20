// AppShell — Structure globale avec gestion responsive Sidebar/BottomNav
import { useEffect, type ReactNode } from "react";
import { isRouteErrorResponse, Outlet, useLocation, useNavigate } from "react-router";
import type { Route } from "./+types/AppShell";
import { useAuth } from "../../contexts/AuthContext";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import OfflineBanner from "./OfflineBanner";
import { LoadingOverlay } from "../ui/Spinner";

/** Ossature partagée par l'app normale et l'ErrorBoundary — sans elle, une
 * erreur n'importe où dans une page faisait disparaître toute la navigation
 * (Sidebar/BottomNav) au lieu de rester confinée au contenu en défaut. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      {/* Sidebar Desktop (visible lg+) */}
      <Sidebar />

      {/* Contenu Principal */}
      <div className="flex-1 flex flex-col lg:ml-[256px] min-w-0">
        <OfflineBanner />
        <TopBar />

        {/* Le pb-32 permet de ne pas cacher le bas de page derrière la BottomNav sur mobile */}
        <main className="flex-1 p-5 md:p-8 pb-32 lg:pb-8 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>

      {/* BottomNav Mobile (visible < lg) */}
      <BottomNav />
    </div>
  );
}

export default function AppShell() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { state: { from: location }, replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, location]);

  if (isLoading || !isAuthenticated) {
    return <LoadingOverlay label="Restauration de la session…" />;
  }

  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Erreur";
  let details = "Une erreur inattendue s'est produite sur cette page.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Erreur";
    details =
      error.status === 404
        ? "La page demandée est introuvable."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <Shell>
      <div className="flex flex-col items-center justify-center text-center py-16 max-w-md mx-auto">
        <span
          className="material-symbols-outlined text-6xl mb-4"
          style={{ color: "var(--color-error)" }}
        >
          error
        </span>
        <h1 className="text-headline-md mb-2" style={{ color: "var(--color-on-background)" }}>
          {message}
        </h1>
        <p className="text-body-md mb-6" style={{ color: "var(--color-on-surface-variant)" }}>
          {details}
        </p>
        {stack && (
          <pre
            className="text-left text-xs p-4 rounded-lg overflow-x-auto w-full"
            style={{ backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }}
          >
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </Shell>
  );
}
