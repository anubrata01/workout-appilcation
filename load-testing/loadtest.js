// k6 load test against the real deployed API — read-heavy endpoints only
// (workout day fetch, analytics report), reusing a pre-authenticated token
// instead of logging in per virtual user. Login is throttled to 10/min per
// IP (auth-write scope) — hammering it from many VUs would just measure that
// limit, not the infrastructure. See README.md in this folder for how to get
// a token and run this.
//
// Install k6 first: https://k6.io/docs/get-started/installation/
// Run: k6 run -e BASE_URL=https://<your-domain>/api -e ACCESS_TOKEN=<token> loadtest.js

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL;
const TOKEN = __ENV.ACCESS_TOKEN;

if (!BASE_URL || !TOKEN) {
  throw new Error("Set BASE_URL and ACCESS_TOKEN env vars — see README.md");
}

// Start small. A t2/t3.micro-class box can queue hard well before 50
// concurrent users per our earlier ~16-simultaneous-request estimate — ramp
// up gradually and watch error rate / p95 latency rather than jumping
// straight to a big number against production.
export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 25 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"], // fail the run if >5% of requests error
    http_req_duration: ["p(95)<2000"], // flag if 95th percentile exceeds 2s
  },
};

export default function () {
  const headers = { Authorization: `Bearer ${TOKEN}` };
  const today = new Date().toISOString().slice(0, 10);

  const dayRes = http.get(`${BASE_URL}/v1/workouts/days/${today}/`, { headers });
  check(dayRes, { "day: status 200": (r) => r.status === 200 });

  const reportRes = http.get(`${BASE_URL}/v1/analytics/reports/?range=week`, { headers });
  check(reportRes, { "report: status 200": (r) => r.status === 200 });

  sleep(1);
}
