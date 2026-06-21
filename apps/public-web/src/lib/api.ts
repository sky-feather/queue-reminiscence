import { treaty } from "@elysia/eden";
import type { App, PublicBoardEventItem, PublicBoardReadData } from "@queue-reminiscence/api/types";

import { API_BASE_URL } from "./env";

type FetchFn = typeof globalThis.fetch;

// Response shapes are sourced from the API package (single source of truth).
// Date fields are typed `Date` (server `t.Date()` schemas) but arrive as ISO
// strings over HTTP — consume them via `new Date(value)`.
export type BoardData = PublicBoardReadData;
export type QueueEntry = PublicBoardReadData["queue"][number];
export type MutationAccess = PublicBoardReadData["mutationAccess"];
export type BoardEvent = PublicBoardEventItem;

// The claim result stays a discriminated union: the server schema is flattened
// (all fields optional) only to satisfy TypeScript, but the runtime payload is
// genuinely one of these two shapes, and consumers narrow on `claimed`.
interface Board {
  id: string;
  publicSlug: string;
}

export interface ClaimSuccessData {
  claimed: true;
  board: Board;
  mutationAccessExpiresAt: string;
}

export interface ClaimNotClaimedData {
  claimed: false;
  reason: "expired" | "revoked" | "invalid";
  board?: Board;
  message: string;
}

export type ClaimData = ClaimSuccessData | ClaimNotClaimedData;

// Eden derives the `/api` prefix from the route paths, so the treaty domain is
// the API origin without it.
function apiOrigin(): string {
  if (API_BASE_URL.startsWith("http")) return API_BASE_URL.replace(/\/api\/?$/, "");
  return typeof window !== "undefined" ? window.location.origin : "";
}

function client(fetchFn: FetchFn) {
  return treaty<App>(apiOrigin(), {
    fetch: { credentials: "include" },
    fetcher: fetchFn,
  });
}

type TreatyResult = { data: unknown; error: { value: unknown } | null };

async function unwrap<T>(call: Promise<TreatyResult>): Promise<T> {
  const { data, error } = await call;
  if (error) {
    const body = error.value as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "Request failed");
  }
  return (data as { data: T }).data;
}

export async function claimAccess(
  accessCode: string,
  fetchFn: FetchFn = globalThis.fetch,
): Promise<ClaimData> {
  return unwrap<ClaimData>(client(fetchFn).api.public.access.claim.post({ accessCode }));
}

export async function getBoard(
  publicSlug: string,
  fetchFn: FetchFn = globalThis.fetch,
): Promise<{ board: BoardData }> {
  return unwrap<{ board: BoardData }>(client(fetchFn).api.public.boards({ publicSlug }).get());
}

export async function getBoardEvents(
  publicSlug: string,
  limit?: number,
  fetchFn: FetchFn = globalThis.fetch,
): Promise<{ events: BoardEvent[] }> {
  return unwrap<{ events: BoardEvent[] }>(
    client(fetchFn)
      .api.public.boards({ publicSlug })
      .events.get(limit !== undefined ? { query: { limit } } : {}),
  );
}

export async function addEntry(
  publicSlug: string,
  displayName: string,
  fetchFn: FetchFn = globalThis.fetch,
): Promise<{ entry: QueueEntry }> {
  return unwrap<{ entry: QueueEntry }>(
    client(fetchFn).api.public.boards({ publicSlug }).entries.post({ displayName }),
  );
}

export async function removeEntry(
  publicSlug: string,
  entryId: string,
  fetchFn: FetchFn = globalThis.fetch,
): Promise<{ removed: boolean }> {
  return unwrap<{ removed: boolean }>(
    client(fetchFn).api.public.boards({ publicSlug }).entries({ entryId }).remove.post(),
  );
}

export async function logout(fetchFn: FetchFn = globalThis.fetch): Promise<void> {
  await unwrap(client(fetchFn).api.public.access.logout.post());
}
