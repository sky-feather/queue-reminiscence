import { describe, expect, test } from "bun:test";

import { hashPassword, verifyPassword } from "../src/auth/passwords";

describe("password helpers", () => {
  test("hash does not equal raw password", async () => {
    const raw = "local-demo-password";
    const hash = await hashPassword(raw);

    expect(hash === raw).toBe(false);
    expect(hash.length > raw.length).toBe(true);
  });

  test("valid password verifies", async () => {
    const raw = "correct-horse-battery-staple";
    const hash = await hashPassword(raw);

    expect(await verifyPassword(raw, hash)).toBe(true);
  });

  test("invalid password fails verification", async () => {
    const hash = await hashPassword("expected-password");

    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});
