// AuthContext — Gestion globale de l'état d'authentification
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";

import type { AuthUser, AuthState } from "../types/auth";
import { ROLE_DEFAULT_ROUTES } from "../types/auth";
import {
  login as authLogin,
  logout as authLogout,
  getCurrentUser,
  type AuthError,
} from "../services/authService";
import type { LoginCredentials } from "../types/auth";

// ─── Types du Context ─────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<string>; // retourne la route de redirection
  logout: () => Promise<void>;
  isRole: (...roles: AuthUser["role"][]) => boolean;
}

// ─── Actions du reducer ───────────────────────────────────────────────────────

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOGIN_SUCCESS"; payload: { user: AuthUser; token: string } }
  | { type: "LOGOUT" }
  | { type: "RESTORE_SESSION"; payload: { user: AuthUser; token: string } };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "LOGIN_SUCCESS":
    case "RESTORE_SESSION":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };

    case "LOGOUT":
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };

    default:
      return state;
  }
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // true au démarrage pour tenter de restaurer la session
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restauration de session au montage
  useEffect(() => {
    const saved = getCurrentUser();
    if (saved) {
      dispatch({
        type: "RESTORE_SESSION",
        payload: { user: saved.user, token: saved.access_token },
      });
    } else {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<string> => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const response = await authLogin(credentials);
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: { user: response.user, token: response.access_token },
        });
        return ROLE_DEFAULT_ROUTES[response.user.role];
      } catch (err) {
        dispatch({ type: "SET_LOADING", payload: false });
        throw err as AuthError;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await authLogout();
    dispatch({ type: "LOGOUT" });
  }, []);

  const isRole = useCallback(
    (...roles: AuthUser["role"][]): boolean => {
      if (!state.user) return false;
      return roles.includes(state.user.role);
    },
    [state.user]
  );

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    isRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return ctx;
}

export default AuthContext;
