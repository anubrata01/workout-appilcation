# Product Requirements Document (PRD)
**Product:** LOADED — Workout Tracker (v2.0)
**Status:** Draft for review
**Owner:** Anubrata Sahoo
**Last updated:** 2026-07-25

---

## 1. Background

A working prototype ("LOADED") already exists at `workout application/` — a single-user, no-auth React web UI backed by a minimal Django REST API. It proved out the core interaction model: a dark, high-contrast "gym log" aesthetic, tag-based daily sessions (Push/Pull/Legs/Upper/Lower/Full Body), set-by-set logging of weight × reps, a personal-records feed, and a weekly volume/calorie report.

v2.0 is a ground-up, production-ready rebuild as a **native Android mobile app** (React Native), backed by a **Django microservices backend**, designed to support real multi-user accounts, authentication, and public deployment — while keeping the visual identity and core logging flow the prototype already validated.

## 2. Goals

1. Turn the single-user prototype into a secure, multi-tenant, production-grade product.
2. Preserve and refine the flow that already works: fast set logging, tag-based sessions, PR tracking, weekly reporting.
3. Add the feature depth users expect from a real workout tracker: reusable workout templates/programs, a proper exercise library, streaks and reminders, and richer progress analytics.
4. Ship on infrastructure that can scale to a public user base without a rebuild (microservices, API gateway, managed DB, containerized deployment).
5. Meet baseline production security/reliability expectations: OAuth/SSO, rate limiting, input validation, CORS policy, API versioning, structured logging/observability.

## 3. Non-goals (v2.0)

- iOS app (React Native is chosen so this is a low-cost *future* add — see [02-TRD.md](02-TRD.md) — but it is not in scope now, no Apple Sign-In, no App Store work).
- Social features (following other users, sharing workouts publicly, feeds, comments).
- Nutrition/diet tracking.
- Wearable / health-app integrations (Google Fit, Fitbit, etc.).
- Coach/trainer multi-tenant roles (gym admin dashboards, assigning workouts to clients).
- Payments / subscriptions (the product is free in v2.0; no monetization plumbing).

These are reasonable v3+ candidates and are called out where the architecture should avoid actively blocking them later.

## 4. Target users

- **Primary:** individual lifters/gym-goers who want a fast way to log sets during a workout, see their progress over time, and know when they've hit a new PR. Comfortable with a phone in one hand between sets — the UI must optimize for speed and thumb reach, not information density.
- Single persona for v2.0 (no coach/client split, no admin-facing product surface beyond Django admin for the operator).

## 5. Feature scope (v2.0 — "expanded")

### 5.1 Carried over from the prototype (rebuilt properly)
| Feature | v1 (prototype) | v2.0 change |
|---|---|---|
| Daily workout log | Single global day, no user scoping | Scoped per authenticated user |
| Day tagging (Push/Pull/Legs/Upper/Lower/Full Body) | Fixed 6 tags | Same 6 tags, still simple single-select per day |
| Exercise + set logging (weight, reps, done) | Client-side only validation | Server-side validated, per-user |
| Exercise picker with catalog + custom entry | Hardcoded in-memory catalog | Backed by the real Exercise Library (5.2) |
| "Today's load" volume bar + calorie estimate | Client-computed | Server-computed and persisted for consistent history |
| Personal records (PRs) feed with trend (up/down/same) | Computed live across all `SetEntry` rows | Same logic, scoped per user, served by Analytics service |
| Weekly report (volume by day, sessions, tag split, calories) | Rolling 7-day only | Rolling 7-day + selectable ranges (week/month) |

### 5.2 New in v2.0
- **Authentication & accounts:** sign up / log in with email+password or Google Sign-In; JWT session; password reset via email; logout; account deletion (data export/erase, see §8 Privacy).
- **Exercise library:** curated, server-owned list of exercises (name, primary muscle group, equipment, optional demo image/short description), searchable and filterable by tag/muscle group. Users can still add custom exercises scoped to themselves.
- **Workout templates/programs:** users can save a day's exercise list (without weights/reps) as a reusable template (e.g. "Push Day A"), and start a new log from a template instead of building it from scratch each time.
- **Streaks:** consecutive-day/week logging streak shown on the home/log screen, computed server-side.
- **Reminders/notifications:** local + push (FCM) reminders — e.g. "you usually train on Wednesdays", or a simple user-configured reminder schedule. Notification preferences are user-editable and off by default until explicitly enabled (see §8).
- **Richer analytics:** in addition to the existing weekly chart, a per-exercise progress view (weight/volume over time, using the same chart library) and monthly rollups.

### 5.3 Explicitly out of scope for v2.0 (see §3)

## 6. Key user flows (summary — full detail in [03-APP-FLOW.md](03-APP-FLOW.md))

1. **Onboarding:** install → sign up (email or Google) → optional first-exercise-library tour → land on today's log, empty state.
2. **Core loop:** open app → today's log → tag the session → add exercises (from library, a template, or custom) → log sets → mark sets done → see live volume/calorie feedback → close app (auto-saved).
3. **Review:** switch to Reports tab → see weekly volume/tag split/calories → switch to PRs tab → see current bests and trend.
4. **Templates:** from the exercise picker, choose "start from template" → pick a saved template → exercises pre-populate with empty sets.
5. **Reminders:** user opts in during onboarding or from settings → configures days/time → receives push notification.

## 7. Success metrics (product-level, not infra SLOs — see TRD for those)

- **Activation:** % of signups that log at least one completed set within 24 hours.
- **Retention:** week-2 and week-4 retention (did the user log a session again).
- **Engagement:** median sessions logged per active user per week; streak length distribution.
- **Reliability perception:** rate of failed saves surfaced to the user (should trend to ~0 — offline/optimistic save behavior is a UX requirement, not just a backend concern).

## 8. Privacy & data handling (product-level)

- All workout data is private to the account owner by default (no sharing surface exists in v2.0, so this is enforced by omission as well as by API authorization).
- Notification permission and reminder scheduling are opt-in, never enabled by default.
- Users can delete their account, which must delete (or irreversibly anonymize) their workout history — this is a hard requirement given the microservice/database-per-service design (see TRD §7 for the cross-service deletion approach).
- Google Sign-In requests only the minimal profile scope needed (name, email, avatar) — no additional Google API scopes.

## 9. Open questions for review

> Flag anything below that needs to change before documents are finalized.

1. Is "LOADED" the confirmed product/brand name for v2.0, or should the docs use a placeholder until you decide?
2. Weight unit: prototype is kg-only. Keep kg-only for v2.0, or support a per-user kg/lb preference?
3. Exercise library seed content: should this be authored by you, or is it acceptable for me to seed a reasonably comprehensive default list (~80-120 common exercises across the 6 tags) at build time?
4. Any specific compliance requirement (e.g. GDPR-style data export, since Google Sign-In implies at least basic international users)?

---
**Next document:** [02-TRD.md](02-TRD.md) — Technical Requirements Document
