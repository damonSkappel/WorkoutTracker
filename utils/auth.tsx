import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, registerSessionLostHandler } from "./api";
import {
  clearStoredToken,
  getStoredRefreshToken,
  setStoredSession,
  hasStoredSession,
} from "./config";

export type AuthStatus =
  // Still checking a stored token at launch.
  | "loading"
  // Token verified against the backend.
  | "authenticated"
  // No token, or the backend rejected it.
  | "unauthenticated"
  // We hold a token but the backend never answered, so we can't tell whether
  // it is still good. Keep it and let the user retry.
  | "unreachable";

type AuthValue = {
  status: AuthStatus;
  signIn: (token: string, refreshToken?: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return value;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");

  const checkSession = useCallback(async () => {
    setStatus("loading");

    try {
      if (!(await hasStoredSession())) {
        setStatus("unauthenticated");
        return;
      }

      // If the access token is stale, the request interceptor silently trades
      // the refresh token for a new one before this call goes out.
      await api.get("/auth/verify");
      setStatus("authenticated");
    } catch (err: any) {
      // The server answered, so the token is the problem, not the connection.
      if (err?.response) {
        setStatus("unauthenticated");
        return;
      }

      // Request went out but nothing came back: offline, wrong API URL, or the
      // backend is down. The stored token may still be perfectly good.
      if (err?.request) {
        setStatus("unreachable");
        return;
      }

      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // The axios interceptors clear the token when the backend rejects it. This
  // lets them flip navigation state without reaching for the router directly.
  useEffect(() => registerSessionLostHandler(() => setStatus("unauthenticated")), []);

  const signIn = useCallback(
    async (token: string, refreshToken?: string | null) => {
      await setStoredSession(token, refreshToken);
      setStatus("authenticated");
    },
    [],
  );

  const signOut = useCallback(async () => {
    // Revoke server-side first so the refresh token dies with the session
    // rather than staying usable for its full lifetime.
    try {
      const refreshToken = await getStoredRefreshToken();
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch (error) {
      // Offline or the server is down: still sign out locally.
      console.warn("[auth] Could not revoke the session server-side.", error);
    }

    await clearStoredToken();
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, signIn, signOut, retry: checkSession }),
    [status, signIn, signOut, checkSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
