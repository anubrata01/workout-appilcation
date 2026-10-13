# v3 release checklist

Nothing here has been run. Do it in order; stop and roll back at the first failure.

## Before merging
- [ ] All suites green: workout, analytics, nutrition, auth, notification (`manage.py test` / `pytest`), `npx jest`, `npx tsc --noEmit` in `app/`.
- [ ] Phase 0/1 decided: package rename (D4), privacy policy URL, Sentry, offline queue. Play will not accept the app without a privacy policy.
- [ ] Install a debug build on a real Android phone. Untested on device: notifee lock-screen timer, share card, muscle map, all UI.
- [ ] New native deps (view-shot, sharing, body-highlighter) mean a fresh EAS build; OTA update is not enough.

## Backend deploy (merge `v3-3.0` into `v1`)
1. [ ] Snapshot RDS (manual snapshot named `pre-v3-<date>`).
2. [ ] Merge to `v1`, approve the deploy workflow.
3. [ ] Confirm containers ran: workout `migrate` (0005) and `seed_exercise_library`; nutrition `alembic upgrade head` (c4d8e1f7a3b2) and `python -m app.seed_foods`.
4. [ ] Set `IMAGE_BASE_URL` for workout-service in `.env.production`.
5. [ ] Smoke test with a real token: `GET /v1/workouts/library/?search=bench`, `GET /v1/nutrition/foods/search?q=rice`, `GET /v1/analytics/exercises/records/`, save a day, fetch the muscle distribution.
6. [ ] Check an old installed build still logs a workout and food (additive API, D14).
7. [ ] Run `load-testing/loadtest.js` against staging or prod off-peak; watch p95 and EC2 memory (about 950MB box).

## App release
- [ ] Bump version, `eas build --platform android --profile production` (AAB).
- [ ] Upload to Play internal testing first, then promote.

## Rollback
- Backend: redeploy the previous image tags. Migrations are additive, so old code runs on the new schema; no down-migration needed.
- If data is damaged: restore the `pre-v3` RDS snapshot (loses writes since).
- App: halt the Play rollout and ship the previous AAB.
