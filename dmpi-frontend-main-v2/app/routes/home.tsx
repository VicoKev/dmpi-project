// Home route — Redirection vers le dashboard selon le rôle
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { ROLE_DEFAULT_ROUTES } from "../types/auth";
import { LoadingOverlay } from "../components/ui/Spinner";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        navigate("/login", { replace: true });
      } else {
        const destination = ROLE_DEFAULT_ROUTES[user.role] || "/login";
        navigate(destination, { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  return <LoadingOverlay />;
}
