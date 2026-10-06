import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/nestjs-core/**/*.spec.ts',
      'packages/nestjs-repository/**/*.spec.ts',
      'packages/nestjs-repository-typeorm/**/*.spec.ts',
      'packages/nestjs-crud/**/*.spec.ts',
      'packages/nestjs-cache/**/*.spec.ts',
      'packages/nestjs-otp/**/*.spec.ts',
      'packages/nestjs-role/**/*.spec.ts',
      'packages/nestjs-password/**/*.spec.ts',
      'packages/nestjs-user/**/*.spec.ts',
      'packages/nestjs-invitation/**/*.spec.ts',
      'packages/nestjs-federated/**/*.spec.ts',
      'packages/nestjs-authentication/**/*.spec.ts',
      'packages/nestjs-access-control/**/*.spec.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      reporter: ['text', 'json', 'lcov'],
    },
  },
});
