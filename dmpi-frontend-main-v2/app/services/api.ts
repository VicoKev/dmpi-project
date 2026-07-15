export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

const TOKEN_KEY = "dmpi_access_token";

export function getStoredToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("dmpi_user");
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    if (!path.includes("/auth/login")) {
      throw new AuthError("Session expiree. Veuillez vous reconnecter.", 401);
    }
  }

  if (response.status === 403) {
    throw new AuthError("Acces refuse. Vous n'avez pas les droits necessaires.", 403);
  }

  if (!response.ok) {
    let detail = `Erreur ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // pas de corps JSON
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Télécharge un fichier binaire (PDF, Excel...) depuis l'API et déclenche le
 * téléchargement navigateur — apiFetch ne convient pas car il parse toujours
 * la réponse en JSON.
 */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { headers });

  if (response.status === 401) {
    clearToken();
    throw new AuthError("Session expiree. Veuillez vous reconnecter.", 401);
  }
  if (response.status === 403) {
    throw new AuthError("Acces refuse. Vous n'avez pas les droits necessaires.", 403);
  }
  if (!response.ok) {
    throw new Error(`Erreur ${response.status} lors du telechargement.`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = filename;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}
