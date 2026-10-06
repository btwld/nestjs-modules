import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/nestjs-core/**/*.e2e-spec.ts',
      'packages/nestjs-repository/**/*.e2e-spec.ts',
      'packages/nestjs-repository-typeorm/**/*.e2e-spec.ts',
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
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
