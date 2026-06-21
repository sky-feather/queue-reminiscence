import type { AppConfig } from "@queue-reminiscence/config";
import type { Database } from "@queue-reminiscence/db";
import { Elysia, t } from "elysia";

import {
  createDbDisplayDeviceResolver,
  type DisplayDeviceResolver,
} from "../display/display-devices";
import {
  buildDisplayEtag,
  createDbDisplayStateService,
  type DisplayStateService,
} from "../display/display-state";
import { forbiddenError, unauthorizedError } from "../http/errors";
import { apiModels } from "../http/models";
import { API_TAGS } from "../http/openapi-config";
import { DisplayStatePayload, success } from "../http/schemas";
import { apiSuccess } from "../http/response";

export interface DisplayRouteDeps {
  config: AppConfig;
  db: Database;
  displayDeviceResolver?: DisplayDeviceResolver;
  displayStateService?: DisplayStateService;
}

export function displayRoutes(deps: DisplayRouteDeps) {
  const resolver =
    deps.displayDeviceResolver ?? createDbDisplayDeviceResolver(deps.db, deps.config);
  const stateService =
    deps.displayStateService ?? createDbDisplayStateService(deps.db, deps.config);

  return new Elysia({ name: "display-routes" }).use(apiModels).get(
    "/api/display/:displayToken/state",
    async ({ params, request, set }) => {
      const { displayToken } = params;

      const device = await resolver.resolveDevice(displayToken);

      if (!device) {
        throw unauthorizedError("Display device not found.");
      }

      if (device.status === "revoked") {
        throw forbiddenError("Display device has been revoked.");
      }

      const payload = await stateService.buildState(device);
      const etag = buildDisplayEtag(payload.displayVersion);

      set.headers["ETag"] = etag;
      set.headers["Cache-Control"] = "no-store";

      const ifNoneMatch = request.headers.get("if-none-match");
      if (ifNoneMatch === etag) {
        set.status = 304;
        return;
      }

      return apiSuccess({ state: payload });
    },
    {
      params: "DisplayTokenParams",
      response: {
        200: success(t.Object({ state: DisplayStatePayload })),
        304: t.Void(),
        401: "ErrorResponse",
        403: "ErrorResponse",
      },
      detail: {
        summary: "Display device state",
        description:
          "Returns board state optimized for e-ink or kiosk display devices. Supports ETag/If-None-Match for efficient polling (304 when unchanged). Auth via displayToken in URL path. The publicAccess field is only populated when the device has canViewPublicAccessPayload permission.",
        tags: [API_TAGS.display],
      },
    },
  );
}
