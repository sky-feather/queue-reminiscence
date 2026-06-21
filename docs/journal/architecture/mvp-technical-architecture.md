# Queue Reminiscence MVP Technical Architecture

Status: Draft v0.1  
Owner: Sky Feather / Setsuna architecture handoff  
Source of truth: Queue Reminiscence PRD draft v0.1, 2026-06-13

## 1. Executive Decision

Queue Reminiscence will be built as a TypeScript monorepo with:

- **Backend:** Bun + Elysia.js
- **Frontend:** SvelteKit, with separate public and admin apps
- **Database:** PostgreSQL
- **Database toolkit:** Drizzle ORM + Drizzle migrations
- **Auth:** DB-backed opaque sessions, not JWT-first
- **Ingress:** externally managed Traefik supported for homelab/demo deployment
- **Database deployment:** externally managed Postgres supported for homelab/demo deployment
- **Display integration:** HTTP polling display-state API in MVP; MQTT via outbox worker later

The core product rule is:

> The board is permanent. The permission to write on it is fresh.

The API owns all product rules and mutations. Frontends render state and submit user intent; they do not decide authorization, queue order, or audit behavior.

## 2. Goals

MVP must support:

- operator/admin accounts
- Organization -> Venue -> Board hierarchy
- readable public board slugs
- no participant accounts
- QR/access-code-derived public mutation sessions
- public add/remove for anyone with valid current access
- public visible board events
- soft deletion of queue entries
- admin board management and panic controls
- manual QR/access credential rotation
- rate limiting for public mutations
- display-state API suitable for e-ink and future MQTT
- local community demo deployment
- future SaaS-compatible data model

## 3. Non-Goals for MVP

Explicitly out of scope:

- participant registration/login
- participant identity verification
- public self-service board creation
- public SaaS signup
- billing/subscriptions
- native mobile app
- queue reordering/pass/hold
- automatic daily reset
- MQTT publishing as a required feature
- geolocation/Wi-Fi enforcement
- CAPTCHA by default
- advanced abuse detection beyond basic rate limits
- event sourcing as the source of truth

## 4. Repository Layout

Recommended monorepo layout:

```text
queue-reminiscence/
  apps/
    api/                 # Bun + Elysia API, authoritative state owner
    public-web/          # SvelteKit participant/public board UI
    admin-web/           # SvelteKit operator/admin UI
  packages/
    db/                  # Drizzle schema, migrations, seed helpers
    domain/              # shared domain types, validation, policies
    config/              # env parsing and runtime config helpers
    ui/                  # optional shared Svelte components/design tokens
  docs/
    architecture/
    deployment/
    plans/
```

The first implementation may keep packages minimal, but the boundary should be established early to avoid mixing domain logic into UI apps.

## 5. Runtime Services

### 5.1 Required Application Services

```text
queue-reminiscence-api
queue-reminiscence-public-web
queue-reminiscence-admin-web
```

### 5.2 Infrastructure Services

The application must support both bundled local development infrastructure and externally managed homelab infrastructure.

Development profile:

```text
app services + local Postgres container + local reverse proxy optional
```

Homelab/demo profile:

```text
app services only
external shared Postgres
external shared Traefik
```

This keeps the repo friendly to new contributors while matching the homelab operating model.

## 6. Deployment Profiles

### 6.1 Local Development

Use `docker-compose.dev.yml` or local Bun commands with a local Postgres container.

Suggested ports:

```text
public-web: http://localhost:3000
admin-web:  http://localhost:3001
api:        http://localhost:3002
postgres:   localhost:5432
```

### 6.2 Homelab Demo

Use externally managed Postgres and Traefik.

Suggested hostnames:

```text
queue.umi4.life          -> public-web
admin.queue.umi4.life    -> admin-web
queue.umi4.life/api      -> api
admin.queue.umi4.life/api -> api
```

A shared Postgres instance is acceptable. Queue Reminiscence must use a dedicated database and dedicated DB user, for example:

```text
database: queue_reminiscence
user: queue_reminiscence
schema: public or app
```

Do not share a schema with other applications.

### 6.3 Future SaaS/Cloud

Future cloud deployment should be able to reuse the same service boundaries:

```text
public-web + admin-web + api + managed Postgres + managed ingress/load balancer
```

No MVP data model should assume a single venue or single tenant globally.

## 7. Environment Configuration

Required core env:

```env
NODE_ENV=development
DATABASE_URL=postgres://queue_reminiscence:...@postgres:5432/queue_reminiscence
PUBLIC_APP_URL=https://queue.example.com
ADMIN_APP_URL=https://admin.queue.example.com
API_PUBLIC_BASE_URL=https://queue.example.com/api
API_ADMIN_BASE_URL=https://admin.queue.example.com/api
TRUST_PROXY=true
SESSION_SECRET=change-me
TOKEN_HMAC_SECRET=change-me
RATE_LIMIT_HMAC_SECRET=change-me
ADMIN_SESSION_TTL_DAYS=14
PUBLIC_MUTATION_SESSION_TTL_HOURS=8
```

Rules:

- `DATABASE_URL` must be the only database location assumption.
- `TRUST_PROXY=true` is required behind Traefik so secure cookies and client IP handling are correct.
- Secrets must be strong random values in deployment.
- The app must not require bundled Postgres or bundled Traefik.

## 8. Backend Architecture

The API is the system of record.

Responsibilities:

- admin authentication and session lifecycle
- admin RBAC
- organization/venue/board CRUD
- QR/access credential lifecycle
- public access claim flow
- public queue mutations
- event logging
- soft deletion
- rate limiting
- audit metadata hashing/storage
- display-state API
- QR SVG/PNG rendering endpoints
- OpenAPI generation

Backend rules:

- all mutations go through Elysia API endpoints
- all authorization is enforced server-side
- all queue mutations occur in DB transactions
- domain logic should live in shared services/modules, not route handlers only
- route handlers should parse input, call domain services, and shape HTTP responses

## 9. Frontend Architecture

### 9.1 Public Web App

Audience: participants.

Responsibilities:

- `/q/:accessCode` access claim entry
- `/b/:publicSlug` public board view
- mobile-first queue display
- add-name form
- remove confirmation dialog
- collapsed recent activity section
- expired/access-invalid messaging
- clear open/closed state

The public app must not expose admin concepts or require participant login.

### 9.2 Admin Web App

Audience: venue staff, venue managers, organization owners.

Responsibilities:

- login/logout
- dashboard
- organization/venue/board navigation
- board create/edit
- board live operation
- open/close/reset
- rotate QR/access credential
- generate/copy QR/access URLs
- staff management basics
- detailed event history

Dangerous operations require confirmation:

- reset queue
- rotate QR link
- close board
- disable staff account

## 10. Database Model

Use UUID primary keys for internal identity. Slugs are human-facing identifiers, not primary keys.

### 10.1 Core Tenant Hierarchy

```ts
Organization {
  id: string
  slug: string
  name: string
  createdAt: Date
  updatedAt: Date
}

Venue {
  id: string
  organizationId: string
  slug: string
  name: string
  timezone: string
  address?: string
  createdAt: Date
  updatedAt: Date
}

Board {
  id: string
  venueId: string
  slug: string
  publicSlug: string
  name: string
  description?: string
  status: "open" | "closed"
  publicViewPolicy: "open" | "access_code_required"
  publicAddPolicy: "access_code_required" | "staff_only" | "disabled"
  publicRemovePolicy: "access_code_required" | "staff_only" | "disabled"
  qrRotationPolicy: "manual" | "scheduled"
  qrRotationIntervalMinutes?: number
  nextSortOrder: number
  displayVersion: number
  createdAt: Date
  updatedAt: Date
}
```

`Board.nextSortOrder` prevents queue-order races. `Board.displayVersion` supports efficient display polling.

### 10.2 Queue and Events

```ts
QueueEntry {
  id: string
  boardId: string
  displayName: string
  sortOrder: number
  status: "active" | "removed"
  createdAt: Date
  removedAt?: Date
  removedByEventId?: string
}

BoardEvent {
  id: string
  boardId: string
  actorType: "public" | "admin" | "system"
  actorAdminUserId?: string
  type:
    | "entry_added"
    | "entry_removed"
    | "entry_restored"
    | "board_reset"
    | "board_opened"
    | "board_closed"
    | "access_rotated"
  entryId?: string
  displayNameSnapshot?: string
  publicMessage: string
  createdAt: Date
}

AuditMetadata {
  id: string
  eventId: string
  ipHash?: string
  userAgentHash?: string
  publicSessionId?: string
  createdAt: Date
}
```

Queue entries are soft-deleted. `BoardEvent` is an audit/activity log, not the source of truth.

### 10.3 Admin Auth and RBAC

```ts
AdminUser {
  id: string
  email: string
  displayName: string
  passwordHash: string
  status: "active" | "disabled"
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

AdminSession {
  id: string
  adminUserId: string
  tokenHash: string
  expiresAt: Date
  createdAt: Date
  lastSeenAt?: Date
  revokedAt?: Date
}

AdminMembership {
  id: string
  adminUserId: string
  organizationId: string
  venueId?: string
  role: "org_owner" | "venue_manager" | "venue_staff"
  createdAt: Date
  updatedAt: Date
}
```

Use opaque admin session tokens stored as hashes. Do not use JWTs as the primary admin session mechanism for MVP.

### 10.4 Public QR/Access Sessions

```ts
BoardAccessCredential {
  id: string
  boardId: string
  tokenHash: string
  tokenPreview: string
  version: number
  status: "active" | "expired" | "revoked"
  expiresAt?: Date
  createdAt: Date
  revokedAt?: Date
  createdByAdminUserId?: string
  revokedByAdminUserId?: string
}

PublicBoardSession {
  id: string
  boardId: string
  credentialId: string
  tokenHash: string
  status: "active" | "expired" | "revoked"
  expiresAt: Date
  createdAt: Date
  lastSeenAt?: Date
}
```

QR/access credential raw tokens are never stored. Store `HMAC-SHA256(TOKEN_HMAC_SECRET, rawToken)`.

### 10.5 Display Devices

```ts
DisplayDevice {
  id: string
  boardId: string
  name: string
  tokenHash: string
  status: "active" | "revoked"
  canViewPublicAccessPayload: boolean
  lastSeenAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

Display credentials are separate from public mutation credentials.

## 11. Auth and Session Model

### 11.1 Admin Sessions

Admin login uses:

- email/password
- Argon2id password hashing
- DB-backed opaque session tokens
- `HttpOnly`, `Secure`, `SameSite=Lax` cookies
- session revocation support
- disabled-account enforcement on every request

Admin mutation routes should use CSRF protection or same-origin/custom-header enforcement. The implementation should be explicit and tested.

### 11.2 Public Mutation Sessions

Participants do not have accounts.

Access flow:

1. participant scans current QR/access URL
2. browser opens `/q/:accessCode`
3. public app calls API to claim access
4. API validates active credential
5. API creates short-lived `PublicBoardSession`
6. API sets an opaque HttpOnly public-session cookie
7. participant lands on `/b/:publicSlug`
8. participant can add/remove while session is valid

Default public mutation session lifetime:

```text
8 hours, or credential expiry, whichever comes first
```

Manual QR/access rotation must revoke old active credentials and revoke public sessions minted from them. Rotation is a panic control, not merely a future-scan control.

## 12. Public QR/Access Credential Flow

### 12.1 Claim Endpoint

```text
POST /api/public/access/claim
```

Request:

```json
{
  "accessCode": "raw-code-from-url"
}
```

Success response:

```json
{
  "ok": true,
  "board": {
    "publicSlug": "echo-mbk-chunithm-gold"
  },
  "mutationAccessExpiresAt": "2026-06-13T20:00:00Z"
}
```

Expired/revoked response:

```json
{
  "ok": false,
  "reason": "expired",
  "board": {
    "publicSlug": "echo-mbk-chunithm-gold"
  },
  "message": "This queue link is no longer active for editing."
}
```

When possible, expired QR links should degrade to view-only board access.

### 12.2 Rotation Endpoint

```text
POST /api/admin/boards/:boardId/access-credentials/rotate
```

Transaction behavior:

```text
BEGIN
  lock board row
  revoke active credentials for board
  revoke public sessions tied to old credentials
  create new credential
  insert BoardEvent(type = "access_rotated")
  increment Board.displayVersion
COMMIT
```

Response includes the new access URL and QR endpoints.

## 13. Queue Mutation Transactions

Every queue mutation must be transactional.

### 13.1 Add Entry

```text
BEGIN
  lock board row
  validate board open
  validate public/admin permission
  validate display name
  apply rate limit if public
  insert QueueEntry(sortOrder = Board.nextSortOrder)
  increment Board.nextSortOrder
  insert BoardEvent(entry_added)
  insert AuditMetadata if public
  increment Board.displayVersion
COMMIT
```

### 13.2 Remove Entry

Use soft-removal, preferably via `POST .../remove` instead of HTTP `DELETE`.

```text
BEGIN
  lock board row
  validate board open or admin override
  validate public/admin permission
  apply rate limit if public
  update QueueEntry status = removed, removedAt = now()
  insert BoardEvent(entry_removed)
  insert AuditMetadata if public
  increment Board.displayVersion
COMMIT
```

### 13.3 Reset Queue

```text
BEGIN
  lock board row
  soft-remove all active entries
  insert BoardEvent(board_reset)
  increment Board.displayVersion
COMMIT
```

## 14. API Shape

### 14.1 Public Read

```text
GET /api/public/boards/:publicSlug
GET /api/public/boards/:publicSlug/events
```

### 14.2 Public Access

```text
POST /api/public/access/claim
POST /api/public/access/logout
```

### 14.3 Public Mutations

```text
POST /api/public/boards/:publicSlug/entries
POST /api/public/boards/:publicSlug/entries/:entryId/remove
```

### 14.4 Admin Auth

```text
POST /api/admin/auth/login
POST /api/admin/auth/logout
GET  /api/admin/me
```

### 14.5 Admin Operations

```text
GET    /api/admin/organizations
POST   /api/admin/organizations
GET    /api/admin/venues
POST   /api/admin/venues
GET    /api/admin/boards
POST   /api/admin/boards
GET    /api/admin/boards/:boardId
PATCH  /api/admin/boards/:boardId
POST   /api/admin/boards/:boardId/open
POST   /api/admin/boards/:boardId/close
POST   /api/admin/boards/:boardId/reset
POST   /api/admin/boards/:boardId/access-credentials/rotate
GET    /api/admin/boards/:boardId/events
GET    /api/admin/boards/:boardId/entries
```

### 14.6 Display

Preferred:

```text
GET /api/display/state
Authorization: Bearer <displayToken>
```

Constrained-device compatible alternative:

```text
GET /api/display/:displayToken/state
```

MVP may support the URL-token version first if e-ink firmware simplicity matters.

## 15. Display-State API

Display-state is an MVP API because it constrains the domain model correctly, even if full display device management is minimal.

Example response:

```json
{
  "board": {
    "publicSlug": "echo-mbk-chunithm-gold",
    "name": "CHUNITHM Gold",
    "venueName": "Echo EX10 MBK",
    "organizationName": "Echo EX10",
    "status": "open"
  },
  "queue": [
    {
      "position": 1,
      "displayName": "Aki"
    },
    {
      "position": 2,
      "displayName": "Mika"
    }
  ],
  "queueLength": 2,
  "publicAccess": {
    "url": "https://queue.example.com/q/...",
    "qrSvgUrl": "https://queue.example.com/api/qr/....svg",
    "expiresAt": null,
    "version": 12
  },
  "updatedAt": "2026-06-13T11:45:00Z",
  "displayVersion": 42
}
```

If the display credential cannot view public access payloads:

```json
{
  "publicAccess": null
}
```

Caching behavior:

```text
ETag: "board-display-42"
Cache-Control: no-store
```

Support `If-None-Match` and return `304 Not Modified` when the board display version has not changed.

## 16. Rate Limiting and Abuse Controls

Use Postgres-backed rate limiting for MVP. Do not add Redis until traffic requires it.

Suggested table:

```ts
RateLimitBucket {
  id: string
  scope: string
  bucketKey: string
  windowStart: Date
  count: number
  expiresAt: Date
}
```

Suggested public mutation limits:

```text
Per session/board:
- 3 adds / 1 minute
- 10 adds / 10 minutes
- 5 removals / 1 minute
- 20 removals / 10 minutes

Per board:
- 30 public mutation actions / 1 minute
```

Rate-limit keys may combine:

- board ID
- public session ID
- IP hash
- user-agent hash

Hash IP and user-agent values using HMAC. Do not expose these values publicly and do not treat them as durable identity.

Required staff panic controls:

```text
Rotate QR Link
Set Add-Only Mode
Set Staff-Controlled Mode
Reset Queue
Close Board
```

## 17. Observability

MVP observability should include:

- structured API request logs
- request ID propagation
- mutation event logs through `BoardEvent`
- private audit metadata for public mutations
- admin action attribution
- health endpoint
- database migration status in deployment logs

Useful endpoints:

```text
GET /healthz
GET /readyz
```

Readiness should fail if the API cannot reach Postgres.

## 18. Security Requirements

Minimum MVP bar:

1. Admin passwords use Argon2id.
2. Admin sessions are opaque, DB-backed, and revocable.
3. Public mutation sessions are opaque, DB-backed, and revocable.
4. QR/access credential tokens are stored hashed, not raw.
5. Admin RBAC is enforced API-side.
6. Public mutation endpoints require valid current board mutation session.
7. Rotation invalidates old credentials and sessions from those credentials.
8. Public logs do not expose IP, user-agent, session IDs, or admin-private metadata.
9. Queue entries are soft-deleted by normal flows.
10. Secrets are environment-provided and never committed.
11. Cookies are `HttpOnly`, `Secure` in production, and `SameSite=Lax`.
12. CORS is restrictive; production origins come from configured app URLs.

## 19. Testing Strategy

Use tests at three levels:

1. Domain tests for validation and policy decisions.
2. API integration tests against Elysia routes and a test Postgres database.
3. Playwright end-to-end tests for public and admin critical flows.

Critical flows to test:

- admin login/logout
- board creation
- QR/access credential rotation
- public access claim success
- expired/revoked access claim degradation
- add entry
- remove entry
- public recent activity
- reset queue
- display-state ETag / 304 behavior
- public mutation rate limit

## 20. Future Expansion

After MVP:

- scheduled QR rotation
- display device registration UI
- MQTT publishing adapter using outbox table
- queue restore
- suspicious activity dashboard
- profanity moderation settings
- venue branding
- custom domains
- billing/subscriptions
- audit exports
- webhooks/API integrations
- passkeys/2FA for admin users

For MQTT, use an outbox table and worker. Do not publish public mutation tokens to broad topics unless broker ACLs are designed and tested.

## 21. Architecture Risks and Mitigations

### Elysia/Bun novelty

Risk: ecosystem maturity and deployment surprises.

Mitigation:

- keep domain logic framework-independent
- generate OpenAPI early
- integration-test HTTP behavior
- avoid deep plugin coupling
- use Dockerized deployment for reproducibility

### Public removal abuse

Risk: anyone with current access can remove active entries.

Mitigation:

- visible public logs
- soft deletion
- rate limits
- QR rotation
- add-only/staff-controlled modes
- admin reset/open/close controls

### QR screenshot leaks

Risk: current QR is shared remotely.

Mitigation:

- manual rotation in MVP
- rotation revokes old sessions
- future scheduled rotation
- staff panic controls

### Display credential leaks

Risk: display API exposes current public mutation QR.

Mitigation:

- separate display credentials
- per-device public-access-payload permission
- token hashing
- revocation support

### Queue order race conditions

Risk: two participants add simultaneously.

Mitigation:

- lock board row in transaction
- use `Board.nextSortOrder`
- derive displayed position from active entries ordered by `sortOrder`

## 22. Build Sequence

1. Scaffold monorepo.
2. Add shared config/env parsing.
3. Add Drizzle schema and migrations.
4. Add API health/readiness.
5. Add admin auth/session.
6. Add seed admin/org/venue/board script.
7. Add admin board CRUD.
8. Add QR/access credential creation and rotation.
9. Add public access claim flow.
10. Add public board read endpoint/UI.
11. Add add-entry mutation.
12. Add remove-entry mutation.
13. Add public/admin event history.
14. Add rate limiting/audit metadata.
15. Add admin reset/open/close.
16. Add QR SVG endpoint.
17. Add display-state endpoint with ETag.
18. Add Docker/homelab deployment docs.

## 23. Approval Recommendation

This architecture is approved for MVP implementation if the following constraints remain enforced:

- backend owns all mutations and authorization
- Postgres is the source of truth
- no participant accounts are introduced
- public mutation permission comes from fresh QR/access sessions
- queue mutations and event logs are transactional
- external Postgres and Traefik deployment are first-class supported modes
- display-state API is included in MVP as a stable contract
