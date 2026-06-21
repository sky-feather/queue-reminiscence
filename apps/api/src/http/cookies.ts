/**
 * Decode a cookie value, falling back to the raw value when it contains
 * malformed percent-encoding.
 *
 * `decodeURIComponent` throws `URIError` on inputs like `abc%ZZ`. A single bad
 * cookie — often one scoped broadly to a parent domain (analytics, SSO) and
 * sent to every subdomain — must never crash request handling.
 */
function safeDecodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Read a single named cookie from a request's `Cookie` header.
 *
 * Only the requested cookie is decoded; unrelated cookies are never touched,
 * so a malformed neighbour cannot affect the read. Returns the first match, or
 * `undefined` when the cookie is absent or the header is missing.
 */
export function readCookie(headers: Headers, name: string): string | undefined {
  const header = headers.get("cookie");

  if (!header) {
    return undefined;
  }

  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    if (trimmed.slice(0, separatorIndex).trim() !== name) {
      continue;
    }

    return safeDecodeCookieValue(trimmed.slice(separatorIndex + 1).trim());
  }

  return undefined;
}
