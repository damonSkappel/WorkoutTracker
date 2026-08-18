import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import { Platform } from "react-native";

export const TOKEN_KEY = "workout-tracker.auth.token";
export const REFRESH_TOKEN_KEY = "workout-tracker.auth.refresh";
export const DEFAULT_API_URL = "http://localhost:3000";
export const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || "development";
export const API_URL =
  (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

const SECURE_STORE_UNAVAILABLE =
  Platform.OS === "web" || Platform.OS === "windows";
const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

if (!__DEV__ && localhostPattern.test(API_URL)) {
  console.warn(
    "[config] Production build is configured with a localhost API URL. Set EXPO_PUBLIC_API_URL to your deployed backend URL.",
  );
}

type TokenPayload = {
  exp?: number;
  userId?: number;
  email?: string;
};

// The keychainService is part of the lookup key on iOS, so every read, write,
// and delete has to pass the same options or they address different entries.
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: "workout-tracker-auth",
};

const secureRead = async (key: string) => {
  if (SECURE_STORE_UNAVAILABLE) return null;
  return SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
};

// Returns whether the value actually landed in secure storage, so callers know
// if they still need the AsyncStorage fallback.
const secureWrite = async (key: string, value: string) => {
  if (SECURE_STORE_UNAVAILABLE) return false;
  await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
  return true;
};

const secureDelete = async (key: string) => {
  if (SECURE_STORE_UNAVAILABLE) return;
  await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
};

const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwtDecode<TokenPayload>(token);
  } catch {
    return null;
  }
};

export const getTokenExpiryEpochMs = (token: string) => {
  const payload = decodeToken(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
};

export const isTokenExpired = (token: string, skewMs = 30_000) => {
  const expiryMs = getTokenExpiryEpochMs(token);
  if (!expiryMs) return true;
  return Date.now() + skewMs >= expiryMs;
};

// One read/write/clear implementation, used for both the access token and the
// refresh token.
const readStored = async (key: string, label: string) => {
  try {
    const secureValue = await secureRead(key);
    if (secureValue) return secureValue;
  } catch (error) {
    console.warn(`[auth] Secure ${label} read failed. Falling back to AsyncStorage.`, error);
  }

  const fallback = await AsyncStorage.getItem(key);
  if (!fallback) return null;

  try {
    // Only drop the plaintext copy once the secure copy is safely in place.
    if (await secureWrite(key, fallback)) {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.warn(`[auth] ${label} migration to secure storage failed.`, error);
  }

  return fallback;
};

const writeStored = async (key: string, value: string, label: string) => {
  try {
    if (await secureWrite(key, value)) {
      await AsyncStorage.removeItem(key);
      return;
    }
  } catch (error) {
    console.warn(`[auth] Secure ${label} write failed. Falling back to AsyncStorage.`, error);
  }

  // Web, or a device whose keychain refused the write: keep the session in
  // AsyncStorage rather than losing it entirely.
  await AsyncStorage.setItem(key, value);
};

const clearStored = async (key: string) => {
  await Promise.all([secureDelete(key), AsyncStorage.removeItem(key)]);
};

export const getStoredToken = () => readStored(TOKEN_KEY, "token");

export const getStoredRefreshToken = () =>
  readStored(REFRESH_TOKEN_KEY, "refresh token");

export const setStoredToken = (token: string) =>
  writeStored(TOKEN_KEY, token, "token");

/** Persists both halves of a session together. */
export const setStoredSession = async (
  token: string,
  refreshToken?: string | null,
) => {
  await writeStored(TOKEN_KEY, token, "token");
  if (refreshToken) {
    await writeStored(REFRESH_TOKEN_KEY, refreshToken, "refresh token");
  }
};

export const clearStoredToken = async () => {
  await Promise.all([clearStored(TOKEN_KEY), clearStored(REFRESH_TOKEN_KEY)]);
};

/**
 * Whether there is anything worth trying at launch. An expired access token is
 * NOT a dead session any more: the refresh token can trade it for a new one, so
 * only the absence of both credentials means signed out.
 */
export const hasStoredSession = async () => {
  const [token, refreshToken] = await Promise.all([
    getStoredToken(),
    getStoredRefreshToken(),
  ]);

  if (refreshToken) return true;
  // An access token with no refresh token is only useful until it expires.
  return !!token && !isTokenExpired(token);
};
