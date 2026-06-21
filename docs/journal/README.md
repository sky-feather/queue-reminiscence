# Development Journal — Queue Reminiscence

This folder is a **preserved keepsake of how the MVP was built**, kept intact as a progression-history record. The files here are frozen — they capture the architecture decisions, product thinking, and phase-by-phase build log as they were written during development, and are intentionally **not** kept up to date.

> Looking for current docs? See the root [README](../../README.md) for setup and usage, [CONTRIBUTING.md](../../CONTRIBUTING.md) for contributing, and [`docs/deployment/`](../deployment/) for operational guides.

## Product

- [`product/queue-reminiscence-prd.md`](product/queue-reminiscence-prd.md) — the original Product Requirements Document: problem statement, core principles, domain model, UX, and MVP scope.

## Architecture

- [`architecture/mvp-technical-architecture.md`](architecture/mvp-technical-architecture.md) — the MVP technical architecture: stack decisions, repository layout, data model, auth/session flows, display-state API, and security requirements.

## Build plan & phase journals

The MVP was built across 14 phases. The master plan lays out the sequence; each completion journal records what shipped, decisions made, and lessons learned.

- [`plans/2026-06-13-mvp-implementation-plan.md`](plans/2026-06-13-mvp-implementation-plan.md) — master 14-phase implementation plan (Phases 0–14).

| Date       | Journal                                                                          | Phase                              |
| ---------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| 2026-06-13 | [phase-5-completion-journal](plans/2026-06-13-phase-5-completion-journal.md)     | Seed data & admin board management |
| 2026-06-14 | [phase-6-completion-journal](plans/2026-06-14-phase-6-completion-journal.md)     | QR / access credential system      |
| 2026-06-14 | [phase-7-completion-journal](plans/2026-06-14-phase-7-completion-journal.md)     | Public board read & mutation API   |
| 2026-06-14 | [phase-8-completion-journal](plans/2026-06-14-phase-8-completion-journal.md)     | Rate limiting & audit metadata     |
| 2026-06-14 | [phase-9-completion-journal](plans/2026-06-14-phase-9-completion-journal.md)     | QR rendering & display-state API   |
| 2026-06-14 | [phase-10-completion-journal](plans/2026-06-14-phase-10-completion-journal.md)   | Public web app                     |
| 2026-06-14 | [phase-11-completion-journal](plans/2026-06-14-phase-11-completion-journal.md)   | Admin web app                      |
| 2026-06-14 | [phase-12-completion-journal](plans/2026-06-14-phase-12-completion-journal.md)   | End-to-end testing                 |
| 2026-06-14 | [phase-13-completion-journal](plans/2026-06-14-phase-13-completion-journal.md)   | Docker & homelab deployment        |
| 2026-06-14 | [security-hardening-journal](plans/2026-06-14-security-hardening-journal.md)     | Security audit & hardening         |
| 2026-06-15 | [phase-14-implementation-plan](plans/2026-06-15-phase-14-implementation-plan.md) | MVP hardening (plan)               |
| 2026-06-15 | [phase-14-completion-journal](plans/2026-06-15-phase-14-completion-journal.md)   | MVP hardening (completion)         |
