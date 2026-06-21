import type { AdminAuthService, AdminSessionContext } from "./admin-sessions";
import { ADMIN_SESSION_COOKIE_NAME } from "./admin-sessions";
import { readCookie } from "../http/cookies";
import { unauthorizedError } from "../http/errors";

export function readAdminSessionToken(headers: Headers): string | undefined {
  return readCookie(headers, ADMIN_SESSION_COOKIE_NAME);
}

export async function requireAdminSession(
  authService: AdminAuthService,
  headers: Headers,
): Promise<AdminSessionContext> {
  const token = readAdminSessionToken(headers);

  if (!token) {
    throw unauthorizedError();
  }

  return authService.resolve(token);
}
