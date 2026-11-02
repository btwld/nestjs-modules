import { defineConfig } from 'vitest/config';

// Suites that need a stack of test databases (docker/compose.test*.yml). Run
// with `pnpm test:docker` or `pnpm test:docker:oracle`, which name the stack's
// databases in DOCKER_TEST_DATABASES; local only, not part of `test:all` or CI.
// Unset, it runs the open-source stack (scripts/test-docker.mjs `oss`).
const databases = (
  process.env.DOCKER_TEST_DATABASES ?? 'postgres,mysql,mariadb'
).split(',');

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: databases.map(
      (database) => `packages/*/src/${database}/**/*.docker-spec.ts`,
    ),
    exclude: ['**/node_modules/**', '**/dist/**'],
    // One database each, shared: suites must not run against it concurrently.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
