import { describe, expect, test } from "bun:test";

import { readCookie } from "../src/http/cookies";

function headers(cookie?: string): Headers {
  return new Headers(cookie === undefined ? {} : { cookie });
}

describe("readCookie", () => {
  test("reads a present cookie and percent-decodes its value", () => {
    expect(readCookie(headers("qr_public_session=a%20b"), "qr_public_session")).toBe("a b");
  });

  test("returns undefined when the header is absent", () => {
    expect(readCookie(headers(), "qr_public_session") === undefined).toBe(true);
  });

  test("returns undefined when the cookie is not present", () => {
    expect(readCookie(headers("other=1"), "qr_public_session") === undefined).toBe(true);
  });

  test("does not crash on a malformed unrelated cookie and still reads the target", () => {
    // If readCookie threw on the bad neighbour, this test would error out.
    const header = "bad_cookie=abc%ZZ; qr_public_session=good-token";
    expect(readCookie(headers(header), "qr_public_session")).toBe("good-token");
  });

  test("returns the raw value when the target cookie itself is malformed", () => {
    expect(readCookie(headers("qr_public_session=abc%ZZ"), "qr_public_session")).toBe("abc%ZZ");
  });

  test("ignores parts without a separator", () => {
    expect(readCookie(headers("broken; qr_public_session=good-token"), "qr_public_session")).toBe(
      "good-token",
    );
  });

  test("does not match on a value-side substring", () => {
    expect(readCookie(headers("x=qr_public_session=nope"), "qr_public_session") === undefined).toBe(
      true,
    );
  });
});
