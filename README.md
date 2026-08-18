# WorkoutTracker Mobile App (Expo)

React Native mobile app for workout templates, workout sessions, and history.

## Local startup

1. Install frontend dependencies:
   ```bash
   npm install
   ```
2. Create an env file from [.env.example](.env.example):
   ```bash
   cp .env.example .env
   ```
3. Make sure backend API is running on the URL in `EXPO_PUBLIC_API_URL`.
4. Start Expo:
   ```bash
   npx expo start
   ```

## Auth/session handling

- Sessions use a short-lived access token plus a long-lived refresh token, both
  kept in `expo-secure-store` (with an AsyncStorage fallback for web).
- `utils/auth.tsx` holds session state; `app/_layout.tsx` gates routes on it via
  `Stack.Protected`, so signed-out users never reach a protected screen.
- Expired access tokens are refreshed transparently by the axios interceptors in
  `utils/api.ts`. Concurrent requests share a single refresh.
- If the refresh token is dead, the session ends and the login screen explains
  why. Logging out revokes the refresh token server-side.

## Environment and deployment prep

- `EXPO_PUBLIC_API_URL` should point to your deployed backend in staging/production.
- `EXPO_PUBLIC_APP_ENV` should be one of: `development`, `staging`, `production`.
- Do not ship a production build with `localhost` API URLs.

## Useful scripts

- `npm run lint` – lint checks
- `npx tsc --noEmit` – TypeScript compile check
- `npm run ios` / `npm run android` – open simulator flows
