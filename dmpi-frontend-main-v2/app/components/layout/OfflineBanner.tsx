// Bannière hors-ligne — Indicateur de synchronisation en attente
import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // État initial
    setIsOnline(navigator.onLine);

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 4000);
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [wasOffline]);

  if (isOnline && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2 text-label-bold animate-slide-down"
        style={{
          backgroundColor: "var(--color-success-container)",
          color: "var(--color-on-success-container)",
        }}
        role="status"
      >
        <span className="material-symbols-outlined text-[16px]">wifi</span>
        <span>Connexion rétablie — Données synchronisées</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-label-bold animate-slide-down"
      style={{
        backgroundColor: "var(--color-warning-container)",
        color: "var(--color-on-warning-container)",
      }}
      role="alert"
    >
      <span className="material-symbols-outlined text-[16px]">wifi_off</span>
      <span className="flex-1">
        Mode hors-ligne — Les modifications seront synchronisées à la reconnexion
      </span>
      <span
        className="material-symbols-outlined text-[16px] animate-spin"
        style={{ animationDuration: "2s" }}
      >
        sync
      </span>
    </div>
  );
}
