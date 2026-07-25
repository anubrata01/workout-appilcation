# Backend Schema
**Product:** LOADED — Workout Tracker (v2.0)
**Status:** Draft for review
**Last updated:** 2026-07-25

Four services, four logical databases (TRD §5). No cross-database foreign keys — cross-service references are stored as plain UUIDs (e.g. `user_id`) and resolved via the JWT claims or an API call, never a DB-level join. This is what makes the services independently deployable.

Field notes: the prototype's models (`WorkoutDay`, `Exercise`, `SetEntry` — see [tracker/models.py](../../workout%20application/backend/loaded_backend/loaded_backend/tracker/models.py)) are preserved almost exactly in the Workout Service below, with `user` added and the exercise catalog upgraded from a hardcoded dict to a real table.

---

## 1. Auth Service — `auth_db`

```
User
  id                UUID (PK)
  email             citext, unique, not null
  password_hash     varchar, nullable        -- null if account is Google-only
  google_sub        varchar, unique, nullable -- Google's stable subject id, set if signed up/linked via Google
  display_name      varchar
  avatar_url        varchar, nullable
  is_active         boolean, default true     -- flipped false immediately on delete request (TRD §7)
  email_verified    boolean, default false
  created_at        timestamptz
  updated_at        timestamptz

RefreshToken
  id                UUID (PK)
  user_id           FK -> User
  token_hash        varchar, unique           -- store hash, never the raw token
  issued_at         timestamptz
  expires_at        timestamptz
  revoked_at        timestamptz, nullable
  device_info       varchar, nullable         -- coarse (e.g. "Android app"), not full user-agent fingerprinting

PasswordResetToken
  id                UUID (PK)
  user_id           FK -> User
  token_hash        varchar, unique
  expires_at        timestamptz
  used_at           timestamptz, nullable
```

**JWT claims** (issued by Auth, verified by the gateway on every request): `sub` (user id), `email`, `exp`, `iat`. Access token TTL: 15 min. Refresh token TTL: 30 days, rotated on use.

**Endpoints** (`/api/v1/auth/...`): `POST /signup`, `POST /login`, `POST /google`, `POST /refresh`, `POST /logout`, `POST /password-reset/request`, `POST /password-reset/confirm`, `GET /me`, `PATCH /me`, `POST /account/delete` (soft-delete + publishes `account_deleted` event, TRD §7).

---

## 2. Workout Service — `workout_db`

```
WorkoutDay
  id                UUID (PK)
  user_id           UUID, not null, indexed   -- not a DB FK (cross-service); enforced at the application layer
  date              date, not null
  tag               varchar(20), nullable     -- push | pull | legs | upper | lower | full  (unchanged from prototype's TAG_CHOICES)
  created_at        timestamptz
  updated_at        timestamptz
  unique(user_id, date)

Exercise                                       -- a logged exercise instance within a day (unchanged concept from prototype)
  id                UUID (PK)
  day_id            FK -> WorkoutDay, on_delete=CASCADE
  library_item_id   FK -> ExerciseLibraryItem, nullable   -- nullable to allow ad-hoc entries not (yet) saved to the library
  name              varchar(120), not null    -- denormalized copy of the name at time of logging, so renaming a library item later doesn't rewrite history
  order             int, default 0

SetEntry                                       -- unchanged from prototype
  id                UUID (PK)
  exercise_id       FK -> Exercise, on_delete=CASCADE
  weight            float, default 0
  reps              int, default 0
  done              boolean, default false
  order             int, default 0

ExerciseLibraryItem                            -- new: replaces the prototype's hardcoded CATALOG dict
  id                UUID (PK)
  owner_user_id     UUID, nullable            -- null = global/curated item; set = user's custom exercise
  name              varchar(120), not null
  primary_tag       varchar(20), nullable      -- push | pull | legs | upper | lower | full, for default filtering
  muscle_group      varchar(60), nullable      -- e.g. "chest", "hamstrings" — finer-grained than tag
  equipment         varchar(60), nullable      -- e.g. "barbell", "bodyweight"
  image_url         varchar, nullable
  description       text, nullable
  is_curated        boolean, default false    -- true for the seeded default library, false for user-added
  created_at        timestamptz
  unique(owner_user_id, name)                  -- a user can't duplicate a custom exercise name; curated items (owner null) are globally unique by name

WorkoutTemplate                                -- new
  id                UUID (PK)
  user_id           UUID, not null, indexed
  name              varchar(80), not null
  created_at        timestamptz
  updated_at        timestamptz
  unique(user_id, name)

TemplateExerciseItem
  id                UUID (PK)
  template_id       FK -> WorkoutTemplate, on_delete=CASCADE
  library_item_id   FK -> ExerciseLibraryItem, nullable
  name              varchar(120), not null
  order             int, default 0
```

**Endpoints** (`/api/v1/workouts/...`):
- `GET/PUT /days/{date}` — same upsert-the-whole-day contract as the prototype's `WorkoutDayView`, now scoped to `request.user`.
- `GET /library?search=&tag=&muscle_group=` — search/filter.
- `POST /library` — add a custom exercise (becomes `owner_user_id = request.user`).
- `GET /templates`, `POST /templates`, `POST /templates/{id}/apply` (returns exercise list to seed into a day — client still performs the actual day `PUT`).

**Event published:** `set_logged` (day id, user id, date) — fired on every day save where at least one set is `done=true`, fanned out to Analytics and Notification services via the Redis-backed bus (TRD §2).

---

## 3. Analytics Service — `analytics_db`

Deliberately **does not** store a copy of every set. It maintains derived/aggregated tables, rebuilt from `set_logged` events, so Workout Service remains the single source of truth for raw log data.

```
PersonalRecord
  id                UUID (PK)
  user_id           UUID, not null, indexed
  exercise_name     varchar(120), not null    -- matches prototype's PR grouping key (by name, across the user's history)
  best_weight        float
  best_reps          int
  best_date          date
  previous_weight    float, nullable          -- second-best, used to compute trend (mirrors prototype's PRListView logic)
  trend             varchar(10)               -- up | down | same
  updated_at        timestamptz
  unique(user_id, exercise_name)

DailyVolumeSnapshot
  id                UUID (PK)
  user_id           UUID, not null, indexed
  date              date, not null
  volume            float
  calories          int
  tag               varchar(20), nullable
  unique(user_id, date)

StreakState
  user_id           UUID (PK)
  current_streak     int, default 0
  longest_streak     int, default 0
  last_logged_date   date, nullable
```

**Recompute strategy:** on `set_logged`, a Celery task recomputes `PersonalRecord` for the affected exercise name, upserts `DailyVolumeSnapshot` for that date (volume/calorie formula unchanged from the prototype's `estimateCalories`: `volume * 0.1 + (90 if volume > 0 else 0)`), and updates `StreakState`. This mirrors the prototype's `PRListView`/`ReportView` logic (see [tracker/views.py](../../workout%20application/backend/loaded_backend/loaded_backend/tracker/views.py)) but precomputed instead of scanned-live on every request — necessary now that it's multi-user and needs to scale.

**Endpoints** (`/api/v1/analytics/...`): `GET /prs`, `GET /reports?range=week|month`, `GET /exercises/{name}/progress`, `GET /streak`.

---

## 4. Notification Service — `notif_db`

```
ReminderPreference
  user_id           UUID (PK)
  enabled           boolean, default false    -- opt-in, per PRD §8
  days_of_week      int[]                     -- 0=Mon .. 6=Sun
  time_of_day       time
  timezone          varchar, default 'Asia/Kolkata'

DeviceToken
  id                UUID (PK)
  user_id           UUID, indexed
  fcm_token         varchar, unique
  created_at        timestamptz
  last_seen_at      timestamptz

NotificationLog
  id                UUID (PK)
  user_id           UUID, indexed
  kind              varchar(30)               -- reminder | streak_nudge | (future kinds)
  sent_at           timestamptz
  status            varchar(20)               -- sent | failed
```

**Endpoints** (`/api/v1/notifications/...`): `GET/PUT /preferences`, `POST /device-token`, `DELETE /device-token`.
**Scheduled job:** Celery beat checks `ReminderPreference` each minute (bucketed by `time_of_day`) and enqueues sends to matching users via FCM.

---

## 5. Cross-service data-ownership summary

| Data | Owned by | Others access via |
|---|---|---|
| Credentials, profile, session tokens | Auth | JWT claims (no direct DB access) |
| Raw workout logs, exercise library, templates | Workout | `set_logged` events (Analytics, Notification never read Workout's DB directly) |
| PRs, reports, streaks | Analytics | Client calls Analytics endpoints directly; nothing else depends on this data |
| Reminder prefs, device tokens, send history | Notification | Not consumed by any other service |

No service ever queries another service's database directly — this is the enforced rule that keeps the split real rather than nominal.

## 6. Open questions for review

1. `ExerciseLibraryItem.image_url` implies exercise demo images — do you want these sourced (stock/licensed exercise photos or simple line-art icons), or should curated items ship without images in v2.0 and this field stay unused until you have content?
2. Confirm the seeded curated library size mirrors PRD §9 Q3 (~80–120 exercises) is acceptable, or if you want to supply your own list.

---
**Previous:** [04-UI-UX-DESIGN-BRIEF.md](04-UI-UX-DESIGN-BRIEF.md) · **Next:** [06-IMPLEMENTATION-PLAN.md](06-IMPLEMENTATION-PLAN.md)
