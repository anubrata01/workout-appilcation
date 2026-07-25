# LOADED — Workout Tracker (v2.0)

Production rebuild of the `workout application/` prototype: Django microservices backend + React Native (Android-first) app. Planning docs are in [docs/](docs/) — read those first for the why behind everything here.

## Layout

```
docs/                    PRD, TRD, app flow, UI/UX brief, backend schema, implementation plan
services/
  auth-service/           accounts, credentials, JWT issuance (Django, owns auth_db)
  workout-service/         logs, exercise library, templates (Django, owns workout_db)
  analytics-service/       PRs, reports, streaks (Django, owns analytics_db)
  notification-service/    reminder prefs, device tokens (Django, owns notif_db)
gateway/kong.yml          API gateway: routing, JWT verification, rate limiting, CORS
infra/
  docker-compose.yml       brings up all 4 services + Postgres + Redis + Kong locally
  dev-keys/                local-only RS256 keypair (gitignored — see its README)
app/                      React Native (Expo) app — not yet scaffolded
```

## Status (implementation plan Phase 0 + partial Phase 1–3)

- **Auth Service**: fully implemented — signup, login, Google Sign-In verification, refresh rotation, logout, password reset, account soft-delete. 3/3 tests passing.
- **Workout Service**: day log upsert (the core loop), exercise library, templates. User-isolation tested explicitly. 4/4 tests passing.
- **Analytics Service**: PR/volume/streak recompute logic + read endpoints, driven by a Redis pub/sub event listener (`listen_for_events` management command) rather than direct DB access to Workout Service. 5/5 tests passing.
- **Notification Service**: reminder preference + device token CRUD. Scheduled FCM sending (Celery beat) is **not yet built** — that's implementation plan Phase 4.
- **Gateway config** (`gateway/kong.yml`) is written but **not yet verified end-to-end** — Docker wasn't installed on this machine when it was written.
- **React Native app** (Expo, TypeScript, SDK 57): project scaffolded with the full auth flow working against Auth Service — Welcome, Sign up, Log in screens; Redux Toolkit + RTK Query with automatic access-token refresh on 401; JWT stored in `expo-secure-store`; navigation gate that only shows the main app once a session is confirmed. Bottom-tab shell (Log/Reports/PRs) exists with placeholder screens plus a working Settings screen (logout, delete account). Google Sign-In button is present but not wired (needs a real OAuth client id). Verified with `tsc --noEmit` and a full `expo export --platform android` bundle (2793 modules, no errors) — not yet run on a device/emulator.
  - **Not yet built**: the actual Log tab (day nav, tag selector, exercise/set entry — porting the prototype's `LogTab`), Reports charts, PRs list, templates, exercise library browsing, reminders UI, offline queueing.

## Running locally

You need Docker Desktop for the full stack (Postgres + Redis + Kong + all 4 services). Once installed:

```bash
cd infra
bash dev-keys/generate.sh   # one-time: creates the local JWT keypair, gitignored
docker compose up --build
```

Services become reachable directly (bypassing the gateway) at `localhost:8001`–`8004` (auth/workout/analytics/notifications, in that order), and through the gateway at `localhost:8080`. Kong's admin API is at `localhost:8081` — dev-only, never expose that publicly.

### Running one service without Docker (what was used to build/test each service so far)

```bash
cd services/auth-service
python -m venv venv
venv/Scripts/pip install -r requirements.txt      # venv/bin/pip on macOS/Linux
cp .env.example .env                                # then edit as needed
# export the vars from .env (or use a tool like direnv), then:
venv/Scripts/python manage.py migrate
venv/Scripts/python manage.py test
venv/Scripts/python manage.py runserver 8001
```

Same pattern for `workout-service`, `analytics-service`, `notification-service` — each has its own venv, `requirements.txt`, and `.env.example`. This is how every service above was verified (all 15 tests across the 4 services pass on Python 3.14 / Django 6.0).

### Running the app

```bash
cd app
npm install                # already done if you haven't touched node_modules
npx expo start
```

Scan the QR code with Expo Go on your Android phone, or press `a` for an emulator (needs Android Studio's SDK — see the "Android Studio" note from earlier in this project's chat history, or just use Expo Go on a real device for now). The app currently talks directly to `auth-service` on port 8001 (see `app/src/config.ts`) — that service must be running (via Docker Compose, or `manage.py runserver 8001` directly) for login/signup to work. If testing from a physical phone, set `EXPO_PUBLIC_AUTH_API_URL` to `http://<your-machine's-LAN-IP>:8001/api` (Android emulator uses `10.0.2.2` automatically; a phone on the same Wi-Fi cannot reach `localhost`).

## Next steps

See [docs/06-IMPLEMENTATION-PLAN.md](docs/06-IMPLEMENTATION-PLAN.md) for the full phased plan. Immediately next: verify `docker compose up` end-to-end once Docker Desktop is installed, and build out the real Log tab in the app (day nav, tag selector, exercise/set entry) against the now-working Workout Service.
