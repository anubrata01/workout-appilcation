# Load testing

## 1. Install k6

Windows: `choco install k6` (or download the .msi from https://k6.io/docs/get-started/installation/)

## 2. Get an access token (do this once, outside the timed test)

Login is throttled to 10/min per IP — don't loop this. Just run it once:

```bash
curl -X POST https://<your-domain>/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "<a test account email>", "password": "<its password>"}'
```

Copy the `access` field from the response. It expires in 15 minutes — get a fresh one if your test run takes longer than that (you'll see 401s partway through otherwise, which is expected token expiry, not a capacity problem).

Use a dedicated test account, not your real one — the test hits `/v1/workouts/days/<today>/`, which reads whatever is logged for that account on today's date.

## 3. Run the test

```bash
cd load-testing
k6 run -e BASE_URL=https://<your-domain>/api -e ACCESS_TOKEN=<paste token> loadtest.js
```

## 4. Read the results

k6 prints a summary at the end. The numbers that matter:

- **`http_req_failed`** — error rate. Should stay near 0% until you're past the box's real ceiling.
- **`http_req_duration` (p95)** — 95th-percentile response time. Climbing sharply as virtual users increase means requests are queuing (matches the ~16-simultaneous-request ceiling estimate from the gunicorn config — see command-log.md).
- Where the curve bends — the VU count where p95 latency starts climbing fast, or errors start appearing — is your real current capacity, not a guess.

## Cautions

- **This hits your real production box and real RDS/Redis.** There's no staging environment. Consider running during low-traffic hours if the app has any real users.
- The default `options.stages` in `loadtest.js` only ramps to 50 virtual users — deliberately conservative. Raise the `target` values gradually across separate runs rather than jumping straight to hundreds; a t2/t3.micro-class box can queue hard well before that per the ~16-simultaneous-request estimate.
- If you want to test the write path (`saveDay`), remember `workout-write` is throttled to 120/min *per user* — with one shared token, many VUs hitting it will trip that throttle quickly. That's a different thing to measure (your rate limit, not your infra) — don't conflate the two in one run.
