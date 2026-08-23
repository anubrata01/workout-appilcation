# Local Development Runbook
**Last updated:** 2026-07-26

Living record of how to run everything and where things currently stand — kept up to date as a safety net independent of any one conversation's context, and as onboarding for anyone else who touches this repo.

## How to run everything locally

Postgres and Redis run as native Windows services (not Docker — see §4). Six terminals:

```bash
cd "D:\Workout Application 2.0\services\auth-service" && venv\Scripts\python manage.py runserver 0.0.0.0:8001
cd "D:\Workout Application 2.0\services\workout-service" && venv\Scripts\python manage.py runserver 0.0.0.0:8002
cd "D:\Workout Application 2.0\services\analytics-service" && venv\Scripts\python manage.py runserver 0.0.0.0:8003
cd "D:\Workout Application 2.0\services\analytics-service" && venv\Scripts\python manage.py listen_for_events
cd "D:\Workout Application 2.0\services\notification-service" && venv\Scripts\python manage.py runserver 0.0.0.0:8004
cd "D:\Workout Application 2.0\services\notification-service" && venv\Scripts\python manage.py send_due_reminders
```

**Always use `0.0.0.0:<port>`, never bare `<port>`** — plain `runserver 8001` binds to localhost only and a phone on the LAN can't reach it. This has caused real confusion twice already.

Frontend (now on a dev-client build, not Expo Go — see §3):
```bash
cd "D:\Workout Application 2.0\app"
npx expo start --dev-client
```

## 1. Architecture at a glance

4 Django microservices (Auth, Workout, Analytics, Notification), each with its own Postgres database (`auth_db`, `workout_db`, `analytics_db`, `notif_db`, role `loaded`/`loaded`), JWT (RS256) issued by Auth and verified statelessly by the others, Redis pub/sub connecting Workout → Analytics (`set_logged` event) and Auth → everyone (`account_deleted` event). Full detail in [02-TRD.md](02-TRD.md) and [05-BACKEND-SCHEMA.md](05-BACKEND-SCHEMA.md).

React Native / Expo frontend (SDK 54 — SDK 57 was too new for the Play Store's Expo Go, see git history if curious). Redux Toolkit + RTK Query, one API slice per service.

## 2. Known external IDs (safe to keep here — none of these are secrets themselves)

| What | Value |
|---|---|
| Android package name | `com.loadedapp.workout` |
| Google Cloud project | "LOADED" (separate from the unrelated pre-existing "youtube video downloader" project — don't confuse them) |
| Google OAuth **Android** client ID | `329080043230-c0m6njc03ecdols7re6qoo8uv4vv8gcd.apps.googleusercontent.com` — package name + SHA-1 only, never used directly as `webClientId` |
| Google OAuth **Web** client ID | `329080043230-1nigfbim10230vb21vjovi0rnqd44r9s.apps.googleusercontent.com` — this is the one that goes in `services/auth-service/.env` as `GOOGLE_OAUTH_CLIENT_ID` and `app/.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; must match exactly in both places |
| EAS keystore SHA-1 | `E5:7B:14:B7:99:68:AD:16:52:00:B0:A9:DC:31:9B:D9:20:E3:AE:45` — registered on the Google Cloud **Android** OAuth client, must match exactly |
| Firebase project | `workout-591c3` |
| EAS project | `loaded-workout-tracker`, account `anubrata31` |
| Dev LAN IP (for phone testing) | `192.168.0.114` (changed from `.147` on 2026-07-26 — DHCP reassigned it, exactly as this row warned) — re-check with `ipconfig` if API calls silently stop reaching the backend |

**Actual secrets** (never write the values themselves here): JWT RSA keypair (`infra/dev-keys/*.pem`, gitignored), Firebase service account JSON (`services/notification-service/firebase-service-account.json`, gitignored) — **a version of this key was accidentally exposed in a chat transcript on 2026-07-26 and should be rotated if that hasn't happened yet.**

## 3. Frontend build state

Moved off Expo Go on 2026-07-26 — Google Sign-In and push notifications both need native modules Expo Go's sandbox doesn't support. Now using an EAS-built development client (`eas.json` has `development`/`preview`/`production` profiles). To rebuild after a native dependency change: `npx eas-cli build --profile development --platform android`.

**`android.usesCleartextTraffic: true` is required in `app.json`.** Expo Go allows plain HTTP by default; a standalone/EAS dev-client build follows Android's normal policy and silently blocks all cleartext (non-HTTPS) requests otherwise — the app just never reaches the backend, no error surfaces beyond a generic network failure, and the backend logs show zero incoming requests. Since all the LAN API URLs are `http://`, this is required for local dev to work at all on a real build. This is a manifest-level setting — changing it needs a new EAS build, not just a JS reload or Metro restart.

## 4. Docker + Kong gateway

Verified end-to-end on 2026-08-01 — all 4 services, Postgres, Redis, and Kong's JWT/rate-limiting/CORS plugins confirmed working, including the cross-service Redis pub/sub pipeline (Workout → Analytics) inside Docker's network.

**As of 2026-08-23, Kong is opt-in only** (see §7a) — a plain `docker compose up` no longer starts it. To bring it up for local testing the way it's described in this section, add the profile explicitly:

```bash
cd "D:/Workout Application 2.0/infra" && docker compose --profile gateway up -d
```

Uses **different host ports** than the native dev stack so both can run side by side without conflict: Postgres `5442`, Redis `6389`, auth/workout/analytics/notification `18001`–`18004`, Kong proxy `8080`, Kong admin `8091`. The native stack keeps `5432`/`6379`/`8001`–`8004`.

Bugs found and fixed getting this working (first real run — none of this had been exercised before):
- All 4 `Dockerfile`s: `adduser --disabled-password` still prompts interactively for GECOS fields on Debian, which hangs a build forever since there's no terminal attached — needed `--gecos ""` too.
- `infra/postgres-init/init-databases.sh`: `psql --username loaded` with no `--dbname` connects to a database named after the user (`loaded`), which doesn't exist — needed `--dbname "$POSTGRES_DB"` explicitly.
- `infra/postgres-init/windows-local-setup.sql` (written only for the separate native-Windows setup) was sitting inside `postgres-init/`, which Postgres's Docker image auto-runs on init, colliding with the container's own `POSTGRES_USER` creation. Moved to `infra/windows-local-setup.sql`.

Cosmetic-only: the `*-events` containers (background Redis listeners) never report "healthy" — the `HEALTHCHECK` baked into the image probes an HTTP endpoint that only the `gunicorn` command variant serves, not `listen_for_events`. They work correctly regardless (confirmed via logs and the pub/sub test above); the health status is just misleading if hooked up to real orchestration/monitoring later.

**CI/CD**: no GitHub Actions set up yet.

## 5. Resolved: Google Sign-In DEVELOPER_ERROR (2026-07-26)

Root cause: `webClientId` was set to the **Android** client's ID instead of a **Web application** client's ID. Package name and SHA-1 on the Android client were correct the whole time — the Android client isn't the one referenced by `GoogleSignin.configure({webClientId})`. Fixed by creating a Web application client in Google Cloud Console (Clients → Create client → Web application, no origins/redirect URIs needed) and pointing both `.env` files at its ID instead (see §2 table). If Google Sign-In stops working again after this, check this class of bug first — it's a known common gotcha with this library, not a fingerprint mismatch.

Confirmed working end-to-end on 2026-07-26. `WelcomeScreen.tsx`'s temporary verbose error alert is still in place (marked `TEMPORARY` in that file) — revert to a plain generic message next time that file is touched.

Other issues found and fixed along the way, in case any recur:
- **`EXPO_PUBLIC_*` / backend `.env` changes need a process restart**, not just a JS reload — Metro and Django both read env vars once at startup. Metro: stop and rerun `expo start --dev-client`. Django: `Ctrl+C` and rerun `runserver`.
- **DHCP reassigned the dev LAN IP** mid-project (`.147` → `.114`) — re-check with `ipconfig` whenever the phone can't reach the backend and nothing else has changed.
- **Windows Firewall blocked inbound traffic to the venv Python processes** on the Public network profile — existing `python.exe` allow-rules pointed at an unrelated global Python install, not the per-service venv executables. Fixed with an explicit port-range rule: `New-NetFirewallRule -DisplayName "LOADED dev backend (8001-8004)" -Direction Inbound -Protocol TCP -LocalPort 8001-8004 -Action Allow -Profile Any` (must run from an elevated PowerShell, not cmd.exe).
- **A running VPN (ExpressVPN) silently broke LAN traffic** from phone to PC even with the firewall rule in place — its virtual adapter can persist after uninstall until a reboot. If backend connectivity breaks again with no other explanation, check `Get-NetAdapter` for unexpected VPN/tunnel adapters.
- **`services/auth-service`'s venv was missing the `requests` package**, which `google-auth`'s token-verification transport needs at runtime but doesn't declare as a hard dependency — added `requests>=2.32` to `requirements.txt`.
- **`google-services.json` (Android FCM client config) was never generated** — needed a matching Android app registered in the `workout-591c3` Firebase project. It's deliberately committed to git (not treated as a secret — see `.gitignore` comment) since EAS Build only bundles files git doesn't ignore, and its API key is meant to be public per Firebase's own docs.

## 6. Production performance redesign (2026-08-23)

The free-tier EC2 box (`t2.micro`/`t3.micro`, 954MB RAM) was struggling under the original design — heavy swap usage, and gunicorn workers getting killed by `WORKER TIMEOUT` roughly every 30s in a near-continuous cycle. Root cause: the Docker `HEALTHCHECK` spawns a brand-new Python interpreter every 30s just to make one request, which is expensive to fork under memory pressure — sometimes expensive enough to blow past gunicorn's 30s worker timeout, which kills the "stuck" worker, which does more forking, which worsens the pressure. Actual user traffic still mostly got through, but with real latency spikes when a request landed during one of these respawn windows.

Two changes, both applied to `docker-compose.prod.yml` / the 4 Dockerfiles:

- **Kong is no longer part of production.** It's largely redundant here — every service already independently enforces JWT auth (`DEFAULT_AUTHENTICATION_CLASSES`), rate-limiting (`ScopedRateThrottle`), and CORS (`django-cors-headers`), which was a deliberate defense-in-depth choice originally. On a resource-constrained box, paying for a full nginx+Lua runtime for redundant protection isn't worth it. Caddy now routes directly to each service by URL path (see `infra/Caddyfile`) instead of through Kong — one fewer heavy process, one fewer network hop per request. This also incidentally removes two bugs we'd worked around (Kong rewriting the Host header, Kong recomputing `X-Forwarded-Proto`) since Caddy talks to each Django service directly and doesn't have either problem.
  - Kong is **not deleted** — it's now behind an opt-in Docker Compose profile (`gateway`) in the base `docker-compose.yml`, so it's never built or run by a plain `docker compose up` (dev or prod), but still available for local testing: `docker compose --profile gateway up -d` (see §4).
- **Gunicorn switched from multiple sync workers to one `gthread` worker with 4 threads** (`--workers 1 --threads 4 --worker-class gthread --timeout 60`). The original fix for the OOM crash (cutting 3 workers down to 1) fixed memory but made each service handle only one request at a time. Threads share memory within a single process, so this restores real concurrency without paying the multi-process memory cost. Django is thread-safe under a threaded WSGI server out of the box — no application code changes needed.
- Also widened the healthcheck (`--interval=90s`, was 30s, plus `--start-period=15s`) so it forks a fresh Python interpreter a third as often.

Deployed 2026-08-23, with two more real problems hit and fixed along the way:

- **The `-events` services were missing `ALLOWED_HOSTS`/`DEBUG` again** — crash-looping with the same `ImproperlyConfigured` error we'd already fixed once before (see §7's bug list). That earlier fix had been made directly on the server with `nano`, never copied back into this repo — so it was invisible to `git`, and reverted the moment the server did a clean `git pull`. **Lesson: any fix made by editing a file directly on the server must also be made in the actual repo, or it will silently vanish on the next deploy.** Fixed for real this time, committed here.
- **The EC2 root volume (8GB) ran out of disk space THREE separate times** across various rebuilds — building several fresh multi-hundred-MB Python images repeatedly eats a small disk fast, especially via `docker compose up --build` running builds in parallel. `docker system prune -a --volumes -f` bought some room each time but wasn't a lasting fix. Fixed properly by resizing the EBS volume to 20GB (AWS Console → EC2 → Volumes → Modify volume; still within the free tier's 30GB/month) and extending the OS to use it live, no reboot: `sudo growpart /dev/xvda 1 && sudo resize2fs /dev/xvda1`.
- Deploying also requires `docker compose ... up --build -d --remove-orphans` (not just `-d`) the first time this runs against an existing deployment — otherwise the old `gateway` (Kong) container is simply left running alongside everything else instead of being removed, since it's no longer part of the compose file at all.

To deploy this on the server: `git pull`, then `docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up --build -d --remove-orphans`. Watch `free -h`, `df -h /`, and `docker compose ... ps` afterward the same way as previous rebuilds in this doc.

## 7. Production deployment config (free-tier VPS target)

Built and dry-ran locally on 2026-08-08, ahead of actually having a server (plan: Oracle Cloud or AWS free tier, APK shared directly rather than Play Store — see §8). New files:

- `infra/docker-compose.prod.yml` — override applied on top of the base file: `docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d`. Locks down which ports are public (only Caddy's 80/443 — Postgres, Redis, each Django service, and Kong's admin API are internal-only), adds `restart: unless-stopped` everywhere, switches every service to `DEBUG=False` with real secrets pulled from env vars instead of the hardcoded dev values.
- `infra/.env.production.example` — template for the real `.env.production` (gitignored, lives only on the server). Documents exactly which `openssl` command to use for each secret.
- `infra/prod-keys/` — separate production-only JWT RSA keypair, generated via `prod-keys/generate.sh`, never reuses `dev-keys`.
- `gateway/kong.prod.yml` — production Kong config signed against the prod public key, `preserve_host: true` on every route (see bugs below).
- `infra/Caddyfile` — Caddy reverse-proxies `$DOMAIN` → `gateway:8000`, handling automatic HTTPS (Let's Encrypt against a real domain, or its own local CA for testing against `localhost`).

**Real bugs found during the dry run** (none of this had been exercised before either):
- **Compose override `ports: []` does not clear the base file's ports** — Docker Compose merges list fields rather than replacing them by default, so the "lock down ports for production" override silently did nothing. Fix: the compose-spec `!reset` tag — `ports: !reset []`. Verified via `docker compose config` that the merged output actually has no `ports` key before trusting it.
- **`openssl rand -base64` for the Postgres password can break `DATABASE_URL`** — base64 output can contain `/`, `+`, `=`, which are meaningful characters in a `postgres://user:PASSWORD@host/db` URL and aren't automatically escaped anywhere in the compose file. Crashed every service with `dj_database_url.ParseError`. Fix: generate with `openssl rand -hex 24` instead — hex is always URL-safe.
- **Kong rewrites the `Host` header to the upstream's internal address by default** (e.g. `auth-service:8000`) instead of preserving what the client sent, which broke Django's `ALLOWED_HOSTS` check (`DisallowedHost`). Fix: `preserve_host: true` on every route in `kong.prod.yml`.
- **Kong recomputes `X-Forwarded-Proto` from its own incoming connection** (plain HTTP from Caddy, since that hop is internal-only) rather than trusting the header Caddy already set correctly — so Django's `SECURE_SSL_REDIRECT` saw `http` and 301-looped every request. Fix: `KONG_TRUSTED_IPS: "0.0.0.0/0,::/0"` on the gateway service, since Kong is never directly internet-facing in this architecture (only Caddy is) so trusting the whole internal network is safe.
- **`collectstatic` never ran anywhere** — `/admin/` and DRF's browsable API would have been served completely unstyled (missing CSS) under `DEBUG=False` + Whitenoise. Fix: added to the compose `command:` for all 4 web-serving services, run at container start (needs real env vars, so can't happen at Docker build time).
- **Gunicorn logged `Control server error: Permission denied: '/home/appuser'`** on every worker boot — the Dockerfiles create `appuser` with `--no-create-home`, so `$HOME` defaults to a nonexistent, unwritable directory. Fix: `ENV HOME=/app` in all 4 Dockerfiles (added right after `USER appuser`; `/app` is already owned by `appuser`).

**Known non-issue**: testing this against `https://localhost` on Windows hit two purely local quirks unrelated to the actual config — Docker Desktop's port-forwarder sometimes only binds IPv6 after a sleep/resume, and Caddy's local-CA cert generation flaked once and needed its volume wiped and recreated. Neither will occur on a real Linux VPS (no WSL2 port-forwarding layer involved); confirmed the underlying app/Kong/Caddy logic was already correct by testing container-to-container inside the Docker network directly, bypassing the host port-forwarding entirely.

## 8. Deployment plan (in progress)

Decided against the Play Store for now — distributing via a directly-shared APK (EAS `--profile preview`, no Metro dependency) instead. This means no developer account fee, no store listing/privacy-policy requirement, no publishing the OAuth consent screen. Tradeoff: with the consent screen left in "Testing" mode, Google Sign-In only works for accounts added as test users (up to 100) — anyone else needs email signup instead.

Hosting: free-tier VPS, leaning Oracle Cloud (Always Free ARM instance, genuinely free forever vs. AWS's 12-months-then-billed free tier) — not yet provisioned. Once a server exists: install Docker, copy this repo over, fill in `.env.production` from the template, run the compose command from §6a, point `app/.env`'s API URLs at the new domain, one more EAS build.

## 9. Test suite status

38 backend tests passing across all 4 services as of the last full run (auth 3, workout 14, analytics 13, notification 8). Frontend: `npx tsc --noEmit` and `npx expo export --platform android` both clean as of the last check.
