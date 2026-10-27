import { defineConfig } from 'vitest/config';

// Suites that need the databases in docker/compose.test.yml. Run with
// `pnpm test:docker`; local only, not part of `test:all` or CI.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.docker-spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // One database, shared: suites must not run against it concurrently.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
