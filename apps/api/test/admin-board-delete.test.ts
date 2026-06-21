import { describe, expect, test } from "bun:test";

import { createTestApp } from "../src/app";
import { testAppConfig } from "./test-config";
import {
  BOARD_A1,
  BOARD_B1,
  createFakeAuthService,
  createFakeBoardManagementHarness,
  orgOwnerMembership,
  sessionCookie,
  venueManagerMembership,
  venueStaffMembership,
} from "./admin-fixtures";
import type { RateLimiter } from "../src/rate-limit/rate-limiter";

const permissive: RateLimiter = { async checkAndIncrement() {} };

function makeApp(memberships = [orgOwnerMembership]) {
  const harness = createFakeBoardManagementHarness();
  const authService = createFakeAuthService(memberships);
  const app = createTestApp({
    config: testAppConfig,
    adminAuthService: authService,
    boardManagementService: harness.service,
    rateLimiter: permissive,
    checkDatabase: async () => true,
  });
  return { app, harness };
}

async function deleteBoardReq(
  app: ReturnType<typeof makeApp>["app"],
  boardId: string,
  cookie = sessionCookie,
) {
  return app.handle(
    new Request(`http://localhost/api/admin/boards/${boardId}`, {
      method: "DELETE",
      headers: { cookie },
    }),
  );
}

describe("DELETE /api/admin/boards/:boardId", () => {
  test("org owner can delete a managed board → 200, board removed", async () => {
    const { app, harness } = makeApp([orgOwnerMembership]);
    expect(harness.boards.some((b) => b.id === BOARD_A1)).toBe(true);

    const res = await deleteBoardReq(app, BOARD_A1);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, data: { deleted: true } });

    expect(harness.boards.some((b) => b.id === BOARD_A1)).toBe(false);
  });

  test("venue manager can delete assigned board → 200", async () => {
    const { app, harness } = makeApp([venueManagerMembership]);
    expect(harness.boards.some((b) => b.id === BOARD_A1)).toBe(true);

    const res = await deleteBoardReq(app, BOARD_A1);
    expect(res.status).toBe(200);

    expect(harness.boards.some((b) => b.id === BOARD_A1)).toBe(false);
  });

  test("venue staff cannot delete → 403", async () => {
    const { app, harness } = makeApp([venueStaffMembership]);

    const res = await deleteBoardReq(app, BOARD_A1);
    expect(res.status).toBe(403);

    expect(harness.boards.some((b) => b.id === BOARD_A1)).toBe(true);
  });

  test("cross-org board → 404", async () => {
    const { app, harness } = makeApp([orgOwnerMembership]);

    const res = await deleteBoardReq(app, BOARD_B1);
    expect(res.status).toBe(404);

    expect(harness.boards.some((b) => b.id === BOARD_B1)).toBe(true);
  });

  test("unknown board id → 404", async () => {
    const { app } = makeApp([orgOwnerMembership]);

    const res = await deleteBoardReq(app, "00000000-0000-4000-8000-000000000999");
    expect(res.status).toBe(404);
  });

  test("unauthenticated → 401", async () => {
    const { app } = makeApp([orgOwnerMembership]);

    const res = await deleteBoardReq(app, BOARD_A1, "qr_admin_session=bad-token");
    expect(res.status).toBe(401);
  });
});
