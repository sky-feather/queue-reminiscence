# Phase 11 Completion Journal — Admin Web App

**Date:** 2026-06-14  
**Status:** Complete  
**Evidence:** PR #32, PR #33, PR #35, PR #36, merged-main checks

## Summary

Phase 11 delivered the operator-facing SvelteKit app at `apps/admin-web/`. Work was split across five PRs: scaffold first, then login/dashboard/board operations, QR preview polish, and board create/edit/delete.

| PR  | Scope                         | Worker / lane     | Result                                                                  |
| --- | ----------------------------- | ----------------- | ----------------------------------------------------------------------- |
| #32 | Task 11.1                     | `hermes-cursor-1` | SvelteKit scaffold, `api.ts`, layout shell, dev proxy on `/api` → :3002 |
| #33 | Tasks 11.2 + 11.3 (core)      | `hermes-cursor-2` | Login, dashboard, board detail, open/close/reset, rotate, copy URLs     |
| #35 | Task 11.3 (QR preview)        | `hermes-cursor-1` | QR SVG preview after rotate, LAN-safe copy helpers                      |
| #36 | Task 11.3 extension (CRUD UI) | `hermes-cursor-2` | Create/edit board forms, delete board API + UI                          |

## Delivered Routes

```text
/login                    → admin login form
/                         → dashboard (board list, status, queue count, logout)
/boards/new               → create board form
/boards/[boardId]         → board detail, controls, edit form, event history
```

## Behavior Implemented

- SvelteKit admin app on port **3001** with Vite dev proxy to API on **3002** for same-origin session cookies.
- `ADMIN_API_BASE_URL` / shared `api.ts` with `credentials: 'include'` for HttpOnly admin session cookies.
- Login authenticates against `POST /api/admin/auth/login`; invalid credentials show safe inline error.
- Dashboard lists accessible boards with status badge and live queue count (via public board read).
- Board detail page (`AdminBoardControls`): open/close/reset with confirm dialogs; rotate QR link with one-time access URL display; copy public board URL and access URL; QR SVG preview and open-in-new-tab after rotation.
- `AdminEventHistory` shows recent board events on the detail page.
- `AdminBoardEditForm` on board detail: patch board name/policies; delete board with confirmation (PR #36 API + UI).
- `/boards/new` create flow for new boards under accessible venues.

## Verification

After PR #36 merged (`main` @ `0bf2584`):

```text
bun run check
```

Observed result (2026-06-14):

```text
225 pass
6 fail   # createDbRateLimiter integration tests — require local Postgres (same pattern as other DB tests)
```

Admin-web typecheck:

```text
bun run --cwd apps/admin-web check
```

Cross-service smoke (manual, three-app stack):

```text
Postgres → migrate → seed
API :3002 + admin-web :3001 + public-web :3000
Admin login → dashboard → board detail → open → rotate → copy access URL
Participant opens /q/<accessCode> → board mutations
```

## Operational Notes

- `PUBLIC_APP_URL` must be set in root `.env` for correct public board link copy (fixed in PR #33).
- Admin dev proxy mirrors the public-web pattern from PR #31 — session cookies stay on the app origin.
- Board delete is destructive (board, queue, events, credentials); UI requires explicit confirmation.
- `packages/ui` remains a placeholder; admin components live in `apps/admin-web/src/lib/components/`.

## Next Phase

Phase 12 — End-to-End Testing (Playwright critical path across admin + public apps).
