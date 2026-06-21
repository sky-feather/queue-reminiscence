import { parseEnv } from "./env";

export { ConfigError, parseEnv } from "./env";
export type { AppConfig } from "./env";

type RuntimeGlobal = typeof globalThis & {
  Bun?: { env: Record<string, string | undefined> };
  process?: { env: Record<string, string | undefined> };
};

export function getRuntimeEnv(): Record<string, string | undefined> {
  const runtimeGlobal = globalThis as RuntimeGlobal;

  return runtimeGlobal.Bun?.env ?? runtimeGlobal.process?.env ?? {};
}

export function loadConfig(input = getRuntimeEnv()) {
  return parseEnv(input);
}

export const config = loadConfig();
