// Composant Toast — Design system DMPI
// Bandeau de notification éphémère — remplace window.alert() par un
// affichage cohérent avec le reste de l'interface.

export interface ToastData {
  message: string;
  type: "success" | "error";
}

export default function Toast({ toast }: { toast: ToastData | null }) {
  if (!toast) return null;

  return (
    <div
      className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl animate-slide-down text-body-md font-semibold"
      style={{
        backgroundColor: toast.type === "success" ? "var(--color-success)" : "var(--color-error)",
        color: toast.type === "success" ? "var(--color-on-success)" : "var(--color-on-error)",
      }}
    >
      <span className="material-symbols-outlined filled text-[20px]">
        {toast.type === "success" ? "check_circle" : "error"}
      </span>
      {toast.message}
    </div>
  );
}
