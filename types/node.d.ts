declare module 'node:test' { const test: (name: string, fn: () => void | Promise<void>) => void; export default test }
declare module 'node:assert/strict' { const assert: { equal(a: unknown,b: unknown): void; deepEqual(a: unknown,b: unknown): void; ok(value: unknown): void }; export default assert }
