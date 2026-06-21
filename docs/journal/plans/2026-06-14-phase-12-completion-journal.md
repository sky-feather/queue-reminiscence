# Phase 12 Completion Journal — End-to-End Testing

**Date:** 2026-06-14  
**Status:** Complete  
**Evidence:** PR #34, PR #37, merged-main checks

## Summary

Phase 12 added Playwright browser E2E coverage for the MVP product loop. Work was split into setup infrastructure first, then the full critical-path spec.

| PR  | Scope     | Worker / lane     | Result                                                               |
| --- | --------- | ----------------- | -------------------------------------------------------------------- |
| #34 | Task 12.1 | `hermes-cursor-1` | `playwright.config.ts`, `global-setup.ts`, smoke spec, `e2e` scripts |
| #37 | Task 12.2 | `hermes-cursor-2` | `mvp-queue-flow.spec.ts` — full admin → participant → admin loop     |

## Delivered Files

```text
playwright.config.ts              # webServer for api :3002, public-web :3000, admin-web :3001
tests/e2e/global-setup.ts         # qr-smoke-p12 Postgres on :5433, migrate, seed
tests/e2e/smoke.spec.ts           # login page + public 404 smoke
tests/e2e/mvp-queue-flow.spec.ts  # MVP critical path (serial)
tests/e2e/README.md               # ports, prerequisites, run instructions
package.json                      # e2e, e2e:install scripts
```

## MVP Critical Path (`mvp-queue-flow.spec.ts`)

Serial flow against the live three-app stack:

1. Admin logs in at `http://localhost:3001/login`.
2. Admin opens **CHUNITHM Gold** board (reset if needed, then open).
3. Admin rotates QR link and captures the one-time access URL.
4. Participant opens `/q/:accessCode` → lands on `/b/local-demo-venue-chunithm-gold`.
5. Participant adds **Aki** to the queue.
6. Participant removes **Aki** with confirmation dialog.
7. Public recent activity shows joined and left events.
8. Admin event history shows the same events after reload.

## Stack Bootstrap

`global-setup.ts` and `playwright.config.ts` cooperate to stand up the test environment:

- Docker container `qr-smoke-p12` on host port **5433** (create or start existing).
- Writes root `.env` with E2E defaults if missing.
- Runs `db:migrate` and `db:seed` before tests.
- Playwright `webServer` starts API, public-web, and admin-web with env from root `.env`.
- `reuseExistingServer: true` outside CI for faster local iteration.

Default seed credentials for E2E: `admin@example.com` / `e2e-admin-password`.

## Verification

After PR #37 merged (`main` @ `0bf2584`):

```bash
bun run e2e:install   # once — Chromium + deps
bun run e2e
```

Expected: smoke spec + MVP queue flow spec pass against the auto-started stack.

Unit/type gate (separate from E2E):

```text
bun run check
```

Observed result (2026-06-14):

```text
225 pass
6 fail   # createDbRateLimiter — requires Postgres; not exercised by Playwright global-setup alone
```

## Operational Notes

- E2E owns its own Postgres container (`qr-smoke-p12` on :5433); do not confuse with manual dev Postgres on :5432.
- Tests use separate browser contexts for admin (:3001) and public (:3000) to mirror real cross-origin cookie behavior.
- `mvp-queue-flow.spec.ts` uses `mode: 'serial'` because steps share `accessUrl` state across tests in one describe block.
- CI wiring is optional post-MVP; local `bun run e2e` is the acceptance gate for Phase 12.

## Next Phase

Phase 13 — Docker and Homelab Deployment (`docker-compose.dev.yml`, Dockerfiles, deployment docs).
