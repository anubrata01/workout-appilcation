# Decisions and Components

Living log for the GetFit Play Store release sprint (started 2026-10-13).

Rules for keeping this file current:
1. Every decision I make gets an entry in section 1, newest at the bottom: date, what, why, alternatives, status.
2. Whenever a component is added, removed or changes responsibility, section 2 is updated in the same change.
3. Status is one of: Decided (you chose it), Proposed (I chose it, you can overrule), Done, Reverted.
4. Older history lives in `command-log.md`; this file covers the sprint onward.

## 1. Decision log

### D1. Sprint scope (2026-10-13, Decided)
- **What:** Four feature bundles this deployment: routines + Hevy-style log upgrades, nutrition v2, home dashboard, measurements + muscle map. Environment separation and release hardening come first.
- **Why:** You chose all four. Day 6 is a hard cut: anything not verified on staging stays out of prod.
- **Deferred:** social feed, Health Connect, progress photos, Pro paywall/Play Billing, AI coach, guest mode, iOS.

### D2. Environment strategy (2026-10-13, Decided)
- **What:** Local docker for daily dev, plus an on-demand staging EC2. `develop` deploys to staging; `v1` deploys to prod after manual approval. Images tagged by commit SHA instead of `:latest`.
- **Why:** Prod currently receives every push to `v1`, and `:latest` gives no rollback.
- **Alternatives rejected:** always-on staging (extra monthly cost), staging on the prod box (about 950MB RAM, would risk prod).

### D3. Staging database (2026-10-13, Proposed)
- **What:** Staging uses the local Postgres + Redis containers from the base compose, not a second RDS instance.
- **Why:** Staging is disposable and on-demand, so no extra RDS bill.

### D4. Android package rename (2026-10-13, Decided)
- **What:** `com.loadedapp.workout` becomes `com.getfit.app`, with `.staging` and `.dev` suffixes for the other variants.
- **Why:** The package id is permanent after the first Play upload and nothing is published yet.
- **Follow-up:** new Firebase Android apps, Google OAuth Android clients with SHA-1 per variant, new `google-services.json`.

### D5. Play account timeline (2026-10-13, Decided)
- **What:** Play Console account is not created yet. You asked me to leave the closed-testing waiting period out of planning.
- **Note:** If it applies to your account type, it will still gate production. Worth checking in Play Console once the account exists.

### D6. Additive API changes only (2026-10-13, Proposed)
- **What:** New fields are nullable or defaulted, and new endpoints are added rather than old ones changed.
- **Why:** Installed app versions update slowly, so old builds must keep working against the new backend.

### D7. Branch and scope of the v3 build (2026-10-13, Decided)
Phases 2 to 6 are built on branch `v3-3.0`, committed locally, not pushed, nothing deployed. Phases 0 (environments, package rename) and 1 (privacy policy, Sentry, offline queue) are NOT done.

### D8. Caching strategy (2026-10-13, Decided)
- **Phone:** RTK Query caches are persisted. Finished days are kept 14 days, reference data (library, goals) 1 day, analytics 5 minutes, search 10 minutes (`lib/cachePolicy.ts`). Screens refetch on focus only when data is older than a staleness window (`useRefetchOnFocus`).
- **Polling removed:** the old 4 second polling of three analytics endpoints is gone. After a save, analytics tags are invalidated at 2.5s and 9s (`lib/analyticsSync.ts`), giving the event bus time to recompute.
- **Server:** exercise library (curated rows only) cached 10 minutes in LocMem; food search cached 10 minutes in a bounded (500) process dict. A user's own custom exercises and foods are never cached, so they appear instantly.
- **Why:** fewer calls on a small EC2 box, and the app stays usable with a slow connection.

### D9. Food catalogue (2026-10-13, Decided)
197 curated foods seeded by `app/seed_foods.py`, many Indian staples. Values that are estimates carry `is_approx` and the UI says so. No `pg_trgm` for now: ranking is prefix then substring, adequate at this size. Users can add their own foods (My Foods).

### D10. Exercise library (2026-10-13, Decided)
Public-domain exercise dataset, built into `workouts/data/exercise_catalog.json` by `tools/build_exercise_catalog.py` (re-runnable) and seeded on container start. Images are served from a CDN via `IMAGE_BASE_URL`, not stored by us.

### D11. Warm-ups never count (2026-10-13, Decided)
Warm-up sets are excluded from volume, calories and PRs on both server (`analytics/recompute.py`) and client (`isCountedSet`). Records use Epley e1RM, computed at read time from ExerciseDailyBest.

### D12. Body weight lives in measurements (2026-10-13, Decided)
Weight is one measurement kind among several. The old nutrition `weight_kg` field is still accepted and mirrored into measurements so older builds keep working; the new app no longer sends it.

### D13. Future dates tolerate one day (2026-10-13, Decided)
Nutrition rejects dates more than 1 day ahead, so users east of the server's timezone are not blocked on their own "today".

### D14. Additive API only (2026-10-13, Confirmed)
Every v3 change adds fields or endpoints; migrations only add columns with defaults. Old builds keep working against the new backend.

## 2. Component map

### Infrastructure
| Component | What it does |
|---|---|
| EC2 (ap-south-1) | Runs all services via docker compose. Roughly 950MB RAM, so it is tight. |
| RDS Postgres | Production database, separate databases per service. |
| Caddy | Terminates HTTPS and routes `/api/v1/<service>/*` to the right container by path. |
| Redis | Event bus: workout-service publishes `set_logged`, analytics-service consumes it. |
| GitHub Actions `deploy.yml` | Builds the five service images on push, pushes to GHCR, SSHes in and redeploys. |
| `infra/docker-compose.yml` | Base stack for local dev: Postgres, Redis, all services, optional Kong gateway. |
| `infra/docker-compose.prod.yml` | Prod override: no local Postgres, secrets from `.env.production`, Caddy added. |
| `infra/dev-keys`, `infra/prod-keys` | JWT keypairs. Gitignored. Each environment needs its own. |

### Backend services
| Service | Stack | Responsibility |
|---|---|---|
| auth-service | Django | Signup, login, Google sign-in, refresh, profile, account delete. Signs RS256 JWTs. |
| workout-service | Django | Workout days, exercises, sets, exercise library, templates, last-session lookup. Publishes `set_logged`. |
| analytics-service | Django | Consumes `set_logged`. Computes personal records, per-day best, volume snapshots, streaks. Serves reports, PRs, progress. |
| notification-service | Django | Reminder preferences, device tokens, FCM push. |
| nutrition-service | FastAPI | Daily food entries, water, body weight, and the per-day nutrition summary. |

All services verify JWTs with the shared public key. No service reads another's database.

### Mobile app (`app/src`)
| Area | What it does |
|---|---|
| `api/` | RTK Query slices per service. `createServiceBaseQuery` adds the token and does the single shared refresh-on-401. |
| `store/` | `authSlice` (tokens, user), `activeSessionSlice` (in-progress workout, persisted), `index.ts` (persists the API caches). |
| `navigation/` | Bottom tabs plus a stack for History. |
| `screens/main/` | Session, Nutrition, Reports, PRs, Settings, History. |
| `components/workout`, `nutrition`, `analytics`, `charts` | Feature UI. |
| `lib/workoutHelpers.ts` | Date keys, volume and calorie math, duration and clock formatting. |
| `lib/workoutNotification.ts` | Android lock-screen timer notification (notifee). |
| `__tests__/` folders | Jest tests for cache behaviour, the session reducer and helpers. |

### v3 additions
| Component | What it does |
|---|---|
| `workouts/views.py` routines, library, `ExerciseDetailView`, `MuscleDistributionView` | Routine CRUD and apply, searchable library with `recent=1`, per-exercise detail, muscle set/volume split. |
| `analytics/views.py` `ExerciseRecordsView` | Record types (heaviest, best e1RM, best volume) per exercise. |
| `nutrition app/routers/foods.py, goals.py, measurements.py` | Food search, My Foods, recents; daily goals; body measurements. |
| `lib/cachePolicy.ts`, `lib/analyticsSync.ts` | Cache lifetimes and post-save analytics refresh. |
| `lib/nutritionMath.ts`, `lib/nutritionInsights.ts` | Serving scaling, macro split, goal suggestion, period summaries. |
| `lib/muscleMap.ts`, `lib/measurements.ts`, `lib/homeChecklist.ts` | Heat map data, measurement helpers, Home setup checklist. |
| `store/preferencesSlice.ts` | Rest timer length and vibration (persisted). |
| `load-testing/loadtest.js` | k6 script, now also hits food search and the library. |

Not yet built: Phase 0 and 1 items (see D1, D4).
