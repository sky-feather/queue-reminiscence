const ARGON2ID_OPTIONS = {
  algorithm: "argon2id",
  memoryCost: 19_456,
  timeCost: 2,
} as const;

interface BunPasswordApi {
  hash(password: string, options?: typeof ARGON2ID_OPTIONS): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

function bunPassword(): BunPasswordApi {
  const api = (globalThis as { Bun?: { password: BunPasswordApi } }).Bun?.password;
  if (!api) {
    throw new Error("Bun.password is unavailable");
  }

  return api;
}

export async function hashPassword(raw: string): Promise<string> {
  return bunPassword().hash(raw, ARGON2ID_OPTIONS);
}

export async function verifyPassword(raw: string, hash: string): Promise<boolean> {
  return bunPassword().verify(raw, hash);
}
