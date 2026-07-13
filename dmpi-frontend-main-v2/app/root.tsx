import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { AuthProvider } from "./contexts/AuthContext";

export const links: Route.LinksFunction = () => [
  // Preconnect
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  // Manrope + Plus Jakarta Sans
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
  },
  // Material Symbols Outlined
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#005354" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Erreur";
  let details = "Une erreur inattendue s'est produite.";
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
    <main
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="text-center max-w-md">
        <span
          className="material-symbols-outlined text-6xl mb-4 block"
          style={{ color: "var(--color-error)" }}
        >
          error
        </span>
        <h1
          className="text-headline-md mb-2"
          style={{ color: "var(--color-on-background)" }}
        >
          {message}
        </h1>
        <p className="text-body-md mb-6" style={{ color: "var(--color-on-surface-variant)" }}>
          {details}
        </p>
        {stack && (
          <pre className="text-left text-xs p-4 rounded-lg overflow-x-auto"
            style={{ backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }}>
            <code>{stack}</code>
          </pre>
        )}
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-label-bold mt-6 transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          <span className="material-symbols-outlined text-lg">home</span>
          Retour à l'accueil
        </a>
      </div>
    </main>
  );
}
