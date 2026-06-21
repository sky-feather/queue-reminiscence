# Phase 5 Completion Journal — Admin Board Management API

**Date:** 2026-06-13  
**Status:** Complete  
**Evidence:** PR #12, PR #13, PR #14, merged-main checks, real PostgreSQL curl smoke test

## Summary

Phase 5 delivered the admin board-management API surface for Queue Reminiscence. The work was split into three reviewable PRs:

| PR  | Scope                  | Result                                                    |
| --- | ---------------------- | --------------------------------------------------------- |
| #12 | Admin read APIs        | Organizations, venues, board list, and board detail reads |
| #13 | Admin board writes     | Board create and board patch endpoints                    |
| #14 | Admin board operations | Board open, close, and reset endpoints                    |

The merged result gives the future admin UI a complete API spine for finding manageable resources, creating/editing boards, and operating live boards.

## Delivered API Surface

### Read endpoints

```text
GET /api/admin/organizations
GET /api/admin/venues
GET /api/admin/boards
GET /api/admin/boards/:boardId
```

### Board write endpoints

```text
POST  /api/admin/boards
PATCH /api/admin/boards/:boardId
```

### Board operation endpoints

```text
POST /api/admin/boards/:boardId/open
POST /api/admin/boards/:boardId/close
POST /api/admin/boards/:boardId/reset
```

## Behavior Implemented

- Admin routes use the DB-backed admin session cookie flow from Phase 4.
- Read APIs scope organizations, venues, and boards by admin memberships.
- Board detail returns `404` for inaccessible boards to avoid existence leaks.
- Board create defaults new boards to closed/protected mutation behavior.
- Board create/update validates slugs, public slugs, policy fields, and QR rotation constraints.
- Board slug uniqueness is enforced per venue.
- Board public slug uniqueness is enforced globally.
- Board update increments `displayVersion` only for display-visible changes.
- Board open/close/reset use board-operator permission.
- Board open/close are idempotent for already-open/already-closed boards.
- Board open/close create public board events when state changes.
- Board reset always creates a reset event, increments `displayVersion`, and soft-removes active queue entries.
- Board operations run in database transactions and lock the board row before mutation.

## Verification

### Unit and repository checks

After PR #14 merged, merged `main` passed:

```text
bun run check
```

Observed result:

```text
141 pass
0 fail
```

### Real PostgreSQL curl smoke

A disposable local PostgreSQL container was used for end-to-end API verification:

```text
postgres:16-alpine
```

Smoke path:

```text
migrate
→ seed
→ start API
→ GET /healthz
→ GET /readyz
→ POST /api/admin/auth/login
→ GET /api/admin/boards
→ POST /api/admin/boards/:id/close
→ POST /api/admin/boards/:id/open
→ POST /api/admin/boards/:id/reset
→ POST /api/admin/boards
→ PATCH /api/admin/boards/:id
→ verify board_events and boards in PostgreSQL
```

Observed API outcomes:

```text
GET /healthz -> {"ok":true}
GET /readyz  -> {"ok":true}
POST /api/admin/auth/login -> 200
GET /api/admin/boards -> 200
POST /api/admin/boards/:id/close -> 200, changed=false, displayVersion=1
POST /api/admin/boards/:id/open  -> 200, changed=true,  displayVersion=2
POST /api/admin/boards/:id/reset -> 200, changed=true,  displayVersion=3
POST /api/admin/boards -> 200, status=closed, displayVersion=1
PATCH /api/admin/boards/:id -> 200, displayVersion=2
```

Observed database state after the smoke test:

```text
board_events:
board_opened | admin | Board was opened by staff.
board_reset  | admin | Queue was reset by staff.

boards:
chunithm-gold     | open   | 3
curl-smoke-board  | closed | 2
```

## Operational Notes

- The repo uses Bun `1.2.23`; this remains important on the current Hermes host because newer Bun builds can require CPU features unavailable on this VM.
- Local `.hermes/` planning artifacts are not part of the repo and should be kept out of repo-wide Prettier checks, or moved aside before `bun run check`.
- For future real-PostgreSQL smoke tests, reuse or stop/pause the local Postgres container rather than deleting it, unless a clean database is explicitly needed.
- The Postgres image is cached locally, so a fresh pull should not be needed for the next smoke test.

## Next Phase

Phase 6 is the QR/access credential system. It should start from the Phase 5 board-management foundation and add:

- opaque token generation and HMAC hashing helpers
- admin access-credential rotation
- public mutation-session issuance from current credentials
- public queue mutation routes gated by board policy and mutation sessions
