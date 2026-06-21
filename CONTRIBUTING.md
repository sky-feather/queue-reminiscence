# Contributing to Queue Reminiscence

This project is a **Bun workspace** running an **Elysia.js** API and two **SvelteKit** apps. This guide gets you from clone to a green quality gate.

## Prerequisites

- **[Bun](https://bun.sh) ≥ 1.2.23** — the package manager, runtime, and test runner. No Node.js required.
- **Docker** with the Compose plugin — for Postgres locally and for the end-to-end test database.
- **PostgreSQL 16** — supplied by Docker in the steps below, or bring your own.

## Setup

```bash
git clone https://github.com/Umi4Life/queue-reminiscence.git
cd queue-reminiscence
bun install

cp .env.example .env
# Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, and rotate the three *_SECRET values

bun run --cwd packages/db db:migrate
bun run --cwd packages/db db:seed
```

See the root [README](README.md) for full Postgres-startup options.

## Workspace layout

| Workspace         | Role                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `apps/api`        | Elysia.js API — authoritative state, auth, and all business logic |
| `apps/public-web` | SvelteKit participant app — claim access, view and edit a board   |
| `apps/admin-web`  | SvelteKit operator app — manage boards, rotate QR, run operations |
| `packages/config` | Shared environment parsing and runtime configuration              |
| `packages/db`     | Drizzle ORM schema, migrations, and seed script                   |
| `packages/domain` | Shared domain validation and policies                             |
| `packages/ui`     | Shared CSS tokens and base styles                                 |

The API owns authorization. The SvelteKit apps reach it through a type-safe Eden Treaty client (`apps/*/src/lib/api.ts`, typed by `@queue-reminiscence/api/types`) and contain no auth logic of their own — keep it that way.

## Running the stack

Three terminals:

```bash
bun run --cwd apps/api dev          # :3002  (OpenAPI UI at /api/docs)
bun run --cwd apps/public-web dev   # :3000
bun run --cwd apps/admin-web dev    # :3001
```

`PUBLIC_APP_URL` must be exactly `http://localhost:3000` for public session cookies and CORS to work.

## Quality gate

Run this before pushing — CI runs the same thing:

```bash
bun run check
```

`check` is `format:check && lint && typecheck && test`. If formatting fails, fix it with:

```bash
bun run format
```

## Tests

- **Unit / integration** — Bun's native runner: `bun test` (or as part of `bun run check`). Test files live in `apps/*/test` and `packages/*/test`.
- **End-to-end** — Playwright:

  ```bash
  bun run e2e:install   # once — Chromium + system deps
  bun run e2e
  ```

  The e2e suite spins up its **own dedicated Postgres container on port 5433** — it never touches your dev database on 5432. It migrates, seeds, and starts all three apps automatically before running.

## Database changes

After editing `packages/db/src/schema.ts`:

```bash
bun run --cwd packages/db db:generate   # generate a new migration
bun run --cwd packages/db db:migrate    # apply it
```

Commit the generated migration under `packages/db/drizzle/` alongside the schema change.

## Conventions

- **Formatting & linting** are enforced in CI via Prettier and ESLint. Run `bun run format` and `bun run lint` locally.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/), matching the existing history — e.g. `feat:`, `fix(api):`, `refactor(ui):`, `style:`, `docs:`.
- **Branch off `main`** and open a PR; don't push directly to `main`.

## CI overview

On every PR and merge to `main`, GitHub Actions runs:

1. **Quality** — `format:check`, `lint`, `typecheck`, unit tests.
2. **Docker build** — builds the combined image.
3. **E2E** — Playwright against the isolated stack.
4. **Publish** — on merge to `main`, pushes the image to `ghcr.io/<owner>/queue-reminiscence` (`:latest` and `:<git-sha>`).

A green `bun run check` plus passing `bun run e2e` locally means CI should be green too.
