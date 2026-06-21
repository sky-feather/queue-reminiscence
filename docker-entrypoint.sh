#!/bin/sh
set -e

case "$APP" in
  api)
    bun run --cwd packages/db db:migrate
    if [ -n "$SEED_ADMIN_EMAIL" ] && [ -n "$SEED_ADMIN_PASSWORD" ]; then
      bun run --cwd packages/db db:seed
    fi
    exec bun run apps/api/src/index.ts
    ;;
  admin-web)
    export PORT="${PORT:-3001}"
    exec bun apps/admin-web/build/index.js
    ;;
  public-web)
    export PORT="${PORT:-3000}"
    exec bun apps/public-web/build/index.js
    ;;
  *)
    echo "Error: APP must be set to one of: api, admin-web, public-web" >&2
    exit 1
    ;;
esac
