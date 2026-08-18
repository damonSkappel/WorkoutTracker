import axios, { AxiosHeaders } from "axios";
import {
  API_URL,
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
  isTokenExpired,
  setStoredSession,
} from "./config";

export const SESSION_EXPIRED_MESSAGE =
  "Your session expired. Please log in again.";
export const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Check your connection and try again.";

// Endpoints that establish a session. They must never be blocked by a stale
// token or carry one along, or a user holding an expired token can end up
// unable to log back in.
const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
];

const isPublicAuthPath = (url?: string) =>
  !!url && PUBLIC_AUTH_PATHS.some((path) => url.startsWith(path));

// Thrown when we block a request client-side because the token is already
// expired. Carries no `response`, so screens need this to tell it apart from a
// network failure.
export class SessionExpiredError extends Error {
  constructor() {
    super(SESSION_EXPIRED_MESSAGE);
    this.name = "SessionExpiredError";
  }
}

// Explains on the login screen why the user was sent back to it.
let pendingAuthNotice: string | null = null;

export const consumeAuthNotice = () => {
  const notice = pendingAuthNotice;
  pendingAuthNotice = null;
  return notice;
};

// The AuthProvider registers here so these interceptors never have to touch the
// router themselves, which is unsafe from module scope before it has mounted.
let sessionLostHandler: (() => void) | null = null;

export const registerSessionLostHandler = (handler: () => void) => {
  sessionLostHandler = handler;
  return () => {
    if (sessionLostHandler === handler) sessionLostHandler = null;
  };
};

// Several screens can fail at once. Sharing one in-flight teardown collapses
// that burst into a single state change, while still letting a genuinely new
// expiry later on trigger its own.
let endSessionInFlight: Promise<void> | null = null;

export const endSession = async (notice?: string) => {
  if (notice) pendingAuthNotice = notice;
  if (endSessionInFlight) return endSessionInFlight;

  endSessionInFlight = (async () => {
    try {
      await clearStoredToken();
      sessionLostHandler?.();
    } catch (error) {
      console.warn("[auth] Unable to end the session cleanly.", error);
    } finally {
      endSessionInFlight = null;
    }
  })();

  return endSessionInFlight;
};

/**
 * Turns any thrown request error into something worth showing a user.
 * Distinguishes an expired session and an unreachable backend from a genuine
 * server-side error, instead of blaming whatever the caller was doing.
 */
export const getErrorMessage = (err: any, fallback: string) => {
  if (err instanceof SessionExpiredError) return SESSION_EXPIRED_MESSAGE;

  if (err?.response) {
    const status = err.response.status;
    if (status === 401 || status === 403) return SESSION_EXPIRED_MESSAGE;
    return err.response.data?.error || fallback;
  }

  // Request was sent but nothing came back: offline, or the backend is down.
  if (err?.request) return NETWORK_ERROR_MESSAGE;

  return fallback;
};

// Only ever one refresh in flight. A screenful of parallel requests can all
// hit 401 at once; they share this promise and then retry, instead of firing
// N refreshes and rotating the token out from under each other.
let refreshInFlight: Promise<string | null> | null = null;

const performRefresh = async (): Promise<string | null> => {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    // Deliberately a bare axios call: routing this through `api` would recurse
    // back into these interceptors.
    const response = await axios.post(
      `${API_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 15000 },
    );

    const nextToken = response.data?.token;
    if (!nextToken) return null;

    await setStoredSession(nextToken, response.data?.refreshToken);
    return nextToken;
  } catch (error: any) {
    // A network blip is not a dead session, so leave the tokens alone and let
    // the caller surface a connection error instead of signing the user out.
    if (!error?.response) throw error;
    return null;
  }
};

const refreshAccessToken = () => {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

const applyAuthHeader = (config: any, token: string) => {
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set("Authorization", `Bearer ${token}`);
  } else {
    const headers = new AxiosHeaders(config.headers as any);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
};

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  if (isPublicAuthPath(config.url)) return config;

  let token = await getStoredToken();

  // Access tokens are short-lived, so a stale or missing one is the normal case
  // rather than an error. Trade the refresh token in before spending a round
  // trip on a certain 401.
  if (!token || isTokenExpired(token)) {
    if (await getStoredRefreshToken()) {
      token = await refreshAccessToken();

      if (!token) {
        await endSession(SESSION_EXPIRED_MESSAGE);
        return Promise.reject(new SessionExpiredError());
      }
    } else if (token) {
      // Expired access token and nothing to renew it with.
      await endSession(SESSION_EXPIRED_MESSAGE);
      return Promise.reject(new SessionExpiredError());
    }
  }

  if (!token) return config;

  applyAuthHeader(config, token);

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;

    const canRetry =
      (status === 401 || status === 403) &&
      original &&
      !isPublicAuthPath(original.url) &&
      // One attempt only, so a token the server keeps rejecting cannot loop.
      !original.__didRetryAfterRefresh;

    if (canRetry) {
      const nextToken = await refreshAccessToken();

      if (nextToken) {
        original.__didRetryAfterRefresh = true;
        applyAuthHeader(original, nextToken);
        return api(original);
      }

      await endSession(SESSION_EXPIRED_MESSAGE);
    }

    return Promise.reject(error);
  },
);
