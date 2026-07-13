// AppShell — Structure globale avec gestion responsive Sidebar/BottomNav
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import OfflineBanner from "./OfflineBanner";
import { LoadingOverlay } from "../ui/Spinner";

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
    <div className="flex min-h-screen bg-[var(--color-background)]">
      {/* Sidebar Desktop (visible lg+) */}
      <Sidebar />

      {/* Contenu Principal */}
      <div className="flex-1 flex flex-col lg:ml-[256px] min-w-0">
        <OfflineBanner />
        <TopBar />
        
        {/* Le pb-32 permet de ne pas cacher le bas de page derrière la BottomNav sur mobile */}
        <main className="flex-1 p-5 md:p-8 pb-32 lg:pb-8 w-full max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>

      {/* BottomNav Mobile (visible < lg) */}
      <BottomNav />
    </div>
  );
}
