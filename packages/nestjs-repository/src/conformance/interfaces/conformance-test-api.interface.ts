/**
 * The test runner functions the conformance suite registers its cases with,
 * e.g. vitest's or jest's globals.
 */
export interface ConformanceTestApiInterface {
  describe: (name: string, fn: () => void) => void;
  it: (name: string, fn: () => Promise<void> | void) => void;
  beforeAll: (fn: () => Promise<void> | void) => void;
  afterAll: (fn: () => Promise<void> | void) => void;
  beforeEach: (fn: () => Promise<void> | void) => void;
}
