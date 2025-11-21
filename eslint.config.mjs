// @ts-check
import conceptaConfig from '@concepta/eslint-config/nest';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import tsdocPlugin from 'eslint-plugin-tsdoc';
import jsdocPlugin from 'eslint-plugin-jsdoc';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      'packages/*/dist/**',
      '**/node_modules/**',
      '**/.eslintrc.js',
      '**/.eslintrc.spec.js',
      '**/tsconfig.json',
      '**/tsconfig.eslint.json',
      '**/commitlint.config.js',
    ],
  },

  // Extend @concepta/eslint-config/nest (filter out undefined configs)
  ...conceptaConfig.filter(config => config !== undefined),

  // JSDoc recommended config
  jsdocPlugin.configs['flat/recommended-typescript'],

  // Project-specific overrides
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
      tsdoc: tsdocPlugin,
    },
    settings: {
      jsdoc: {
        mode: 'typescript',
      },
    },
    rules: {
      // Import rules
      'import/no-duplicates': 'error',
      'import/no-extraneous-dependencies': 'error',
      // Project-specific import order with @nestjs and @concepta path groups
      'import/order': [
        'error',
        {
          pathGroups: [
            {
              pattern: '@nestjs/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@concepta/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '{./__fixtures__/**,../__fixtures__/**}',
              group: 'sibling',
              position: 'after',
            },
          ],
          alphabetize: {
            order: 'asc',
            caseInsensitive: false,
          },
          pathGroupsExcludedImportTypes: ['builtin', 'object'],
          'newlines-between': 'always',
        },
      ],

      // NestJS typed rules
      '@darraghor/nestjs-typed/param-decorator-name-matches-route-param': 'off',
      '@darraghor/nestjs-typed/injectable-should-be-provided': 'off',

      // JSDoc/TSDoc rules
      'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }],
      'tsdoc/syntax': 'error',
    },
  },

  // TypeScript files override
  {
    files: ['**/*.ts'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
    },
  },

  // Spec and fixture files override
  {
    files: ['**/*.spec.ts', '**/*.fixture.ts'],
    rules: {
      '@darraghor/nestjs-typed/controllers-should-supply-api-tags': 'off',
      '@darraghor/nestjs-typed/api-method-should-specify-api-response': 'off',
      'jsdoc/tag-lines': 'off',
      'tsdoc/syntax': 'off',
    },
  },
);
