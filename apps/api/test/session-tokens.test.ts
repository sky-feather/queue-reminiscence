import { describe, expect, test } from "bun:test";

import { generateSessionToken, hashSessionToken } from "../src/security/session-tokens";

const URL_SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

describe("session token helpers", () => {
  test("generateSessionToken returns URL-safe opaque tokens", () => {
    const token = generateSessionToken();

    expect(token.length >= 43).toBe(true);
    expect(URL_SAFE_TOKEN_PATTERN.test(token)).toBe(true);
  });

  test("hashSessionToken is deterministic for the same token and secret", () => {
    const token = "fixed-session-token";
    const secret = "test-session-secret";

    const first = hashSessionToken(token, secret);
    const second = hashSessionToken(token, secret);

    expect(first).toBe(second);
    expect(URL_SAFE_TOKEN_PATTERN.test(first)).toBe(true);
  });

  test("hashSessionToken changes when token or secret changes", () => {
    const token = "fixed-session-token";
    const secret = "test-session-secret";
    const baseline = hashSessionToken(token, secret);

    expect(hashSessionToken("other-session-token", secret) === baseline).toBe(false);
    expect(hashSessionToken(token, "other-session-secret") === baseline).toBe(false);
  });

  test("generated tokens are unique across repeated generation", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateSessionToken()));

    expect(tokens.size).toBe(20);
  });
});
