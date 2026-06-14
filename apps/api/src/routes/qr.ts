import type { AppConfig } from "@queue-reminiscence/config";
import type { Database } from "@queue-reminiscence/db";
import { boardAccessCredentials } from "@queue-reminiscence/db/schema";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";

import { buildPublicAccessUrl } from "../access/access-url";
import { notFoundError } from "../http/errors";
import { renderQrSvg } from "../qr/render-svg";
import { hashOpaqueToken } from "../security/tokens";

export interface QrRouteDeps {
  config: AppConfig;
  db: Database;
}

export function qrRoutes(deps: QrRouteDeps) {
  const { config, db } = deps;

  return new Elysia({ name: "qr-routes" }).get(
    "/api/qr/:accessCode.svg",
    async ({ params, set }) => {
      const rawParam = (params as Record<string, string>)["accessCode.svg"] ?? "";
      const accessCode = rawParam.endsWith(".svg") ? rawParam.slice(0, -4) : rawParam;

      if (accessCode.length === 0 || accessCode.length > 256) {
        throw notFoundError();
      }

      const tokenHash = hashOpaqueToken(accessCode, config.tokenHmacSecret);

      const [row] = await db
        .select()
        .from(boardAccessCredentials)
        .where(eq(boardAccessCredentials.tokenHash, tokenHash))
        .limit(1);

      if (!row) {
        throw notFoundError();
      }

      const now = new Date();
      if (row.status !== "active" || (row.expiresAt !== null && row.expiresAt <= now)) {
        throw notFoundError();
      }

      const payload = buildPublicAccessUrl(config, accessCode);
      const svg = await renderQrSvg(payload);

      set.headers["Content-Type"] = "image/svg+xml";
      set.headers["Cache-Control"] = "no-store";

      return svg;
    },
  );
}
