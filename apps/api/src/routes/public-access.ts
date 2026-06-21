import type { AppConfig } from "@queue-reminiscence/config";
import { Elysia, t } from "elysia";

import {
  PUBLIC_BOARD_SESSION_COOKIE_NAME,
  type ClaimPublicAccessResult,
  type PublicSessionService,
} from "../auth/public-sessions";
import { readCookie } from "../http/cookies";
import { validationError } from "../http/errors";
import { apiSuccess } from "../http/response";
import { apiModels } from "../http/models";
import { API_TAGS } from "../http/openapi-config";
import { ClaimAccessResult, success } from "../http/schemas";
import { hashClientIp } from "../public/audit-metadata";
import type { RateLimiter } from "../rate-limit/rate-limiter";

export interface PublicAccessRouteDeps {
  config: AppConfig;
  publicSessionService: PublicSessionService;
  rateLimiter: RateLimiter;
}

// Throttle access claims per source IP. Without this, anyone holding a valid
// access code could mint unlimited fresh public sessions, each with a clean
// per-session mutation budget — making the per-session limits decorative.
const CLAIM_IP_LIMIT = { scope: "claim_ip_1m", windowSeconds: 60, maxCount: 10 } as const;
const CLAIM_IP_BURST = { scope: "claim_ip_10m", windowSeconds: 600, maxCount: 40 } as const;

async function enforceClaimRateLimit(
  rateLimiter: RateLimiter,
  config: AppConfig,
  request: Request,
): Promise<void> {
  const ipKey = hashClientIp(request, config) ?? "unknown";
  await rateLimiter.checkAndIncrement({ ...CLAIM_IP_LIMIT, bucketKey: ipKey });
  await rateLimiter.checkAndIncrement({ ...CLAIM_IP_BURST, bucketKey: ipKey });
}

export function readPublicBoardSessionToken(headers: Headers): string | undefined {
  return readCookie(headers, PUBLIC_BOARD_SESSION_COOKIE_NAME);
}

function serializePublicSessionCookie(
  token: string,
  config: AppConfig,
  expiresAt?: Date,
  maxAgeSeconds?: number,
): string {
  const parts = [
    `${PUBLIC_BOARD_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (expiresAt) {
    parts.push(`Expires=${expiresAt.toUTCString()}`);
  }

  if (maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${maxAgeSeconds}`);
  }

  if (
    config.publicAppUrl.startsWith("https://") ||
    config.apiPublicBaseUrl.startsWith("https://")
  ) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function serializeExpiredPublicSessionCookie(config: AppConfig): string {
  return serializePublicSessionCookie("", config, new Date(0), 0);
}

function responseForClaim(result: ClaimPublicAccessResult) {
  if (result.status === "claimed") {
    return {
      claimed: true,
      board: result.board,
      mutationAccessExpiresAt: result.mutationAccessExpiresAt,
    };
  }

  return {
    claimed: false,
    reason: result.status,
    ...("board" in result ? { board: result.board } : {}),
    message: result.message,
  };
}

export function publicAccessRoutes(deps: PublicAccessRouteDeps) {
  return new Elysia({ name: "public-access-routes" })
    .use(apiModels)
    .post(
      "/api/public/access/claim",
      async ({ body, request, set }) => {
        await enforceClaimRateLimit(deps.rateLimiter, deps.config, request);
        const accessCode = body.accessCode.trim();
        if (accessCode.length === 0) throw validationError("Access code is required.");
        const result = await deps.publicSessionService.claimAccess(accessCode);

        if (result.status === "claimed") {
          set.headers["set-cookie"] = serializePublicSessionCookie(
            result.token,
            deps.config,
            result.expiresAt,
          );
        }

        return apiSuccess(responseForClaim(result));
      },
      {
        body: "ClaimAccessBody",
        response: { 200: success(ClaimAccessResult) },
        detail: {
          summary: "Claim public access",
          description:
            "Exchanges an access code for a `qr_public_session` cookie granting mutation access. Rate limited per IP. A non-claimed outcome still returns 200 with `claimed: false` and a reason.",
          tags: [API_TAGS.publicAccess],
        },
      },
    )
    .post(
      "/api/public/access/logout",
      async ({ request, set }) => {
        const token = readPublicBoardSessionToken(request.headers);

        if (token) {
          await deps.publicSessionService.logout(token);
        }

        set.headers["set-cookie"] = serializeExpiredPublicSessionCookie(deps.config);
        return apiSuccess({ loggedOut: true });
      },
      {
        response: { 200: success(t.Object({ loggedOut: t.Literal(true) })) },
        detail: {
          summary: "Revoke public access",
          description: "Revokes the current public mutation session and clears the cookie.",
          tags: [API_TAGS.publicAccess],
        },
      },
    );
}
