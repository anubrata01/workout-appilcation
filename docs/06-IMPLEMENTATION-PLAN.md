# Implementation Plan
**Product:** LOADED — Workout Tracker (v2.0)
**Status:** Draft for review
**Last updated:** 2026-07-25

This plan sequences the build so something runnable exists early (local Docker Compose, one service at a time) and production infra (Kubernetes, gateway) is introduced once the services it's meant to orchestrate actually exist — building the cluster before there's anything to deploy would be wasted motion.

Phases are sequential dependencies, not fixed calendar time — each phase ends with a concrete, checkable exit condition.

## Phase 0 — Repo & environment scaffolding
**Goal:** empty-but-runnable skeleton for every service plus the app, all in one Docker Compose for local dev.

- Monorepo layout under `Workout Application 2.0/`:
  ```
  /services
    /auth-service        (Django project)
    /workout-service      (Django project)
    /analytics-service    (Django project)
    /notification-service (Django project)
  /gateway                (Kong declarative config)
  /app                    (React Native / Expo project)
  /infra
    /docker-compose.yml    (local: all services + Postgres x4 + Redis + Kong)
    /k8s                   (manifests/Helm, added in Phase 5)
  /docs                    (this document set)
  ```
- Each Django service: `settings.py` reading all secrets from env vars (no defaults like the prototype's `"dev-only-change-this-before-deploy"` in anything committed), Postgres via `dj-database-url`, `django-cors-headers` with an explicit (not wildcard) allow-list, health-check endpoint (`/healthz`).
- CI (GitHub Actions): lint + test on every push, per service (path-filtered so a Workout Service change doesn't rebuild Auth).
- **Exit condition:** `docker compose up` brings up all four services + Postgres + Redis + Kong; each service's `/healthz` returns 200 through the gateway.

## Phase 1 — Auth Service (must exist before anything else can be "per-user")
- `User` model, email/password signup+login, JWT issuance (`simplejwt`), refresh/rotation, logout.
- Google Sign-In: backend token verification endpoint; note the RN app-side Google sign-in button is built in Phase 6, but the endpoint can be tested with a manually obtained test token before then.
- Password reset flow (request + confirm), email delivery (can use a dev-mode console backend locally, real SMTP/provider in staging).
- Account soft-delete + `account_deleted` event publish (consumers added in later phases as those services come online).
- Rate limiting on auth endpoints specifically tight (login/signup are the classic brute-force target) — DRF throttle now, gateway-level rule added in Phase 5.
- **Exit condition:** signup, login, refresh, logout, password reset, and Google-token verification all pass integration tests against a real Postgres.

## Phase 2 — Workout Service (the core product loop)
- Port the prototype's `WorkoutDay`/`Exercise`/`SetEntry` models almost as-is (see [05-BACKEND-SCHEMA.md](05-BACKEND-SCHEMA.md) §2), adding `user_id` scoping to every query — this is the change with the highest security consequence in the whole migration (an unscoped query here leaks one user's workout data to another), so it gets explicit test coverage: every endpoint tested for "user A cannot read/write user B's day."
- `ExerciseLibraryItem`: model + seed script for the curated default list (PRD §9 open question — seed a reasonable default now, swappable later).
- `WorkoutTemplate` + `TemplateExerciseItem`, apply-template endpoint.
- Publish `set_logged` event to Redis on day save (consumed starting Phase 3).
- JWT verification middleware shared across services (small internal package or copy-pasted `settings.py` snippet — decide based on how much duplication feels acceptable for 4 services; a shared package is cleaner but adds a versioning concern for a solo project).
- **Exit condition:** full day-log CRUD works end-to-end against Auth-issued tokens; user-isolation tests pass; template create/apply works.

## Phase 3 — Analytics Service (depends on Phase 2's event)
- `PersonalRecord`, `DailyVolumeSnapshot`, `StreakState` models.
- Celery worker consuming `set_logged` events, recomputing PRs/volume/streak — port the prototype's PR/report calculation logic (`views.py`'s `PRListView`/`ReportView`) into the recompute task rather than a live per-request scan.
- Report endpoints (week/month), PR endpoint, per-exercise progress endpoint.
- **Exit condition:** logging a set in the Workout Service (Phase 2) results in updated PRs/reports/streak visible via Analytics endpoints within a few seconds; verified with an end-to-end test that exercises both services together.

## Phase 4 — Notification Service (depends on Phase 2's event, lowest priority of the four)
- `ReminderPreference`, `DeviceToken` models, preference CRUD endpoints.
- Celery beat schedule for reminder sends; FCM integration (server-side send, using a Firebase service account).
- **Exit condition:** a manually-configured reminder preference triggers a real FCM push to a test device token at the scheduled time.

## Phase 5 — Gateway & production cross-cutting concerns
- Kong: JWT verification plugin (so services can trust `X-User-Id`/claims forwarded by the gateway instead of each re-verifying), rate-limiting plugin tuned per route class (auth vs. read vs. write), CORS policy, `/api/v1` routing to each service.
- API versioning convention locked in (TRD §3) — document it in a short `API-CONVENTIONS.md` if useful once real endpoints exist.
- Centralized structured logging wired from all four services to the aggregator; Sentry wired for error tracking; Prometheus metrics exposed per service.
- **Exit condition:** every client request goes through the gateway in local/staging; a request's log line is traceable end-to-end via its request id across services.

## Phase 6 — React Native app
Can start in parallel with Phase 2 onward once Auth (Phase 1) is stable, since the app needs real login before most other screens make sense. Suggested internal sequence:
1. Project scaffold (Expo, Redux Toolkit + RTK Query, React Navigation, the design tokens from [04-UI-UX-DESIGN-BRIEF.md](04-UI-UX-DESIGN-BRIEF.md)).
2. Auth screens (Welcome, Sign up, Log in, Google Sign-In) wired to Phase 1's Auth Service.
3. Home/Log tab — port the prototype's `LogTab`/`ExerciseCard`/`ExercisePicker` logic from web-style (`<div>`/inline styles) to RN components using the token/component system, wired to Phase 2's Workout Service.
4. Reports + PRs tabs, wired to Phase 3's Analytics Service.
5. Templates, library browse/search, settings/reminders, wired to the remaining endpoints.
6. Offline queueing for set saves (TRD §4) — this is a client-side requirement independent of any one backend service and should be tested against real network interruption, not just assumed.
- **Exit condition:** a real device (or emulator) can sign up, log a full workout, see it reflected in Reports/PRs, save a template, and reopen the app after a forced network drop without losing an in-progress set.

## Phase 7 — Deployment infra
- Kubernetes manifests/Helm chart per service + gateway; managed Postgres (one instance/db per service) and managed Redis provisioned; secrets in the cloud provider's secret manager.
- Staging environment stood up first; production only after staging soaks with the full flow from Phase 6's exit condition running against it.
- CI/CD: merge-to-main auto-deploys to staging; production deploy is a manual promote step (not auto-deploy-on-merge) given this is a solo project without a rollback-review process yet.
- **Exit condition:** the app (pointed at the staging API) passes the same manual test pass as Phase 6, running against real cloud infra instead of Docker Compose.

## Phase 8 — Launch readiness
- Backups verified (restore drill, not just "backups are configured").
- Load test the core save path against the p95 < 300ms target (TRD §4) at a representative concurrency.
- Security pass: confirm no wildcard CORS, no debug mode, dependency scan clean, rate limits actually enforced (test by exceeding them), account deletion cross-service purge verified end-to-end.
- Play Store listing assets, privacy policy (references the data-handling commitments in PRD §8 and the deletion SLA from TRD §7).

## Suggested phase ordering note

Phases 1–4 (services) and Phase 6 (app) can overlap heavily — the app can be built against a locally-running Docker Compose stack throughout, so there's no reason to wait for Phase 5/7 (gateway, cloud infra) to start meaningful app work. Phase 5 and 7 are really "make it production-grade," not "make it work" — the fastest path to a demoable product is 1 → 2 → 3 → (6 in parallel from Auth onward) → 4 → 5 → 7 → 8.

## Open questions for review

1. Solo build, or will others (contractors, collaborators) touch this codebase? Affects how much I lean into shared internal packages (e.g. the JWT-verification middleware mentioned in Phase 2) vs. accepting light duplication for simplicity.
2. Target rough timeline (weeks vs. months) — not needed to start, but useful for deciding how much of Phase 5/7's full production tooling to build up front vs. defer past an initial soft launch.

---
**Previous:** [05-BACKEND-SCHEMA.md](05-BACKEND-SCHEMA.md)

## Document set summary

| Doc | Purpose |
|---|---|
| [01-PRD.md](01-PRD.md) | What we're building and why |
| [02-TRD.md](02-TRD.md) | How it's built — architecture, stack, cross-cutting requirements |
| [03-APP-FLOW.md](03-APP-FLOW.md) | Every screen and the paths between them |
| [04-UI-UX-DESIGN-BRIEF.md](04-UI-UX-DESIGN-BRIEF.md) | Visual/interaction system, extending the prototype's theme |
| [05-BACKEND-SCHEMA.md](05-BACKEND-SCHEMA.md) | Data model per microservice, ownership boundaries |
| [06-IMPLEMENTATION-PLAN.md](06-IMPLEMENTATION-PLAN.md) | This document — phased build order with exit conditions |

**Please review all six and flag anything to change before I start building.** Each doc has its own "Open questions" section at the end — those are the fastest way to tell me where you disagree or want a different call.
