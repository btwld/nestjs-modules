import { fileURLToPath } from 'url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      // Package examples import their package by name, as an application
      // would. Point the name at its source, so they run against the code
      // under test rather than the last build.
      {
        find: /^@concepta\/nestjs-access-control$/,
        replacement: fileURLToPath(
          new URL('./packages/nestjs-access-control/src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@concepta\/nestjs-access-control\/optional\/crud$/,
        replacement: fileURLToPath(
          new URL(
            './packages/nestjs-access-control/src/optional-crud.ts',
            import.meta.url,
          ),
        ),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/nestjs-core/**/*.e2e-spec.ts',
      'packages/nestjs-repository/**/*.e2e-spec.ts',
      'packages/nestjs-repository-typeorm/**/*.e2e-spec.ts',
      'packages/nestjs-repository-drizzle/**/*.e2e-spec.ts',
      'packages/nestjs-crud/**/*.e2e-spec.ts',
      'packages/nestjs-cache/**/*.e2e-spec.ts',
      'packages/nestjs-otp/**/*.e2e-spec.ts',
      'packages/nestjs-role/**/*.e2e-spec.ts',
      'packages/nestjs-password/**/*.e2e-spec.ts',
      'packages/nestjs-user/**/*.e2e-spec.ts',
      'packages/nestjs-invitation/**/*.e2e-spec.ts',
      'packages/nestjs-federated/**/*.e2e-spec.ts',
      'packages/nestjs-authentication/**/*.e2e-spec.ts',
      'packages/nestjs-access-control/**/*.e2e-spec.ts',
      'packages/nestjs-file/**/*.e2e-spec.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
