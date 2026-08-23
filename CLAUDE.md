# WorkoutTracker — mobile app

Expo / React Native / TypeScript app for logging gym workouts. Talks to a
separate Express + Postgres API that lives in `../workout-tracker-backend`
(its own repo, with its own CLAUDE.md).

Solo project, built to learn React Native. Explain the reasoning behind a
change, not just the change.

## Running it

```bash
npm install
cp .env.example .env     # then point EXPO_PUBLIC_API_URL at the backend
npx expo start
```

The backend must be running separately. A physical device needs your machine's
LAN IP in `EXPO_PUBLIC_API_URL`, not `localhost`.

```bash
npx tsc --noEmit   # strict mode is ON; this is the real test for this repo
npm run lint
```

There are **no automated tests**. Verification has been by hand and by throwaway
scripts. If you change something subtle, prove it — with a real request against
the running backend, or a small script — rather than asserting it works.

## Layout

```
app/                      file-based routes (expo-router)
  _layout.tsx             AuthProvider + route guards + themed native headers
  index.tsx               login          signup.tsx        signup
  templates.tsx           template list (the app's home)
  create-template.tsx     history.tsx
  template/[id].tsx       template detail
  template/[id]/add-exercise.tsx    doubles as the edit screen
  session/[id].tsx        the active workout
utils/
  theme.ts                ALL design tokens
  api.ts                  axios client, auth interceptors, error messages
  auth.tsx                session state, the source of truth for signed-in-ness
  config.ts               env config + token storage
```

## Things that will bite you

**Styling — never hardcode a colour.** Everything comes from `utils/theme.ts`.
There are currently zero hex literals outside that file and it should stay that
way; the light/dark toggle depends on it.

**Every `TextInput` needs `placeholderTextColor`.** The RN default is dark grey
and effectively invisible on this dark background.

**Auth is not the screens' job.** `utils/auth.tsx` owns session state and
`_layout.tsx` gates routes with `Stack.Protected`. Screens call `signIn` /
`signOut`; they never navigate to `/` themselves to log someone out. `api.ts`
deliberately does not import the router — it notifies the provider instead,
because touching the router from module scope can run before it has mounted.

**Access tokens last 15 minutes and refresh silently.** An expired token is
normal, not an error. The interceptors in `api.ts` swap it transparently and
share a single in-flight refresh — if you add a second refresh path, concurrent
requests will rotate the token out from under each other and the backend will
treat it as a stolen-token replay and kill the session.

**Sets are saved on field blur.** This has caused two real bugs. The last field
on a screen never blurs, because the user taps Finish instead — so anything that
must be persisted is also flushed in `handleFinish` / `handleLeave`. Any new
blur-triggered save needs the same treatment.

**Only one `Alert` at a time on the workout screen.** RN queues them, so two
handlers firing at once make the user dismiss two popups to answer one question.
Use the `alertOnce` helper there.

**`useFocusEffect`, not `useEffect`, for list screens.** They must refetch when
you navigate back, or you see stale data after creating something. The workout
screen is the exception — refetching there would wipe values being typed.

**Fast Refresh does not reliably reload module state in `utils/`.** After
editing `api.ts` or `auth.tsx`, press `r` in the Expo terminal for a full
reload before concluding that auth is broken. `.env` changes always need a
restart, since `EXPO_PUBLIC_*` values are inlined at bundle time.

## Conventions

- Solo dev: commit straight to `main`, no feature branches for ordinary work.
- Errors shown to users go through `getErrorMessage()` in `api.ts`, which
  separates an expired session and an unreachable backend from a real server
  error. Do not reintroduce `err?.response?.data?.error || "..."` inline.
- The API is the authority on validation. Client-side checks exist to fail fast
  and must mirror the server's rules, never replace them.
- `strict: true` is on and the project compiles clean. Keep it that way.
- ~28 explicit `any`s remain (API responses, catch clauses). Strict does not
  flag those. Typing them properly is a known todo, not an oversight.

## Where the work is tracked

`todo.txt` — done items are marked, open items and FUTURE PLANS are at the
bottom, and it records why several decisions were made. Read it before
suggesting what to do next.
