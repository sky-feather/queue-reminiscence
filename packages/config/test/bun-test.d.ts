declare module "bun:test" {
  interface Matchers {
    toBe(expected: unknown): void;
    toBeTypeOf(expected: string): void;
    toEqual(expected: unknown): void;
    toThrow(expected?: unknown): void;
  }

  export function describe(name: string, fn: () => void): void;
  export function expect(value: unknown): Matchers;
  export function test(name: string, fn: () => void): void;
}
