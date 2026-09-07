// @ts-check
import conceptaConfig from '@concepta/eslint-config/nest';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import tsdocPlugin from 'eslint-plugin-tsdoc';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import nPlugin from 'eslint-plugin-n';

// The 13 packages migrated to v8 (nodenext, DDD) — same set as root
// tsconfig.json's `references` and tsconfig.eslint.json's `include`. Only
// these get type-aware linting; older packages predate the migration and
// aren't part of the tsconfig project-reference graph the parser resolves
// against, so linting them with a `project` would fail to find the file.
const v8Packages = [
  'nestjs-core',
  'nestjs-repository',
  'nestjs-repository-typeorm',
  'nestjs-crud',
  'nestjs-cache',
  'nestjs-otp',
  'nestjs-role',
  'nestjs-password',
  'nestjs-user',
  'nestjs-invitation',
  'nestjs-federated',
  'nestjs-authentication',
  'nestjs-access-control',
];
const v8Files = v8Packages.map((name) => `packages/${name}/src/**/*.ts`);

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

  // Type-aware rules, scoped to the migrated v8 packages
  {
    files: v8Files,
    extends: [
      ...conceptaConfig.filter((config) => config !== undefined),
      jsdocPlugin.configs['flat/recommended-typescript'],
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
      tsdoc: tsdocPlugin,
      n: nPlugin,
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
      // nodenext requires explicit `.js` on relative imports — `tsc` enforces
      // this as TS2835; this keeps it enforced at lint time too, and keeps it
      // enforced if `moduleResolution` is ever relaxed. Unlike
      // eslint-plugin-import's `import/extensions`, this rule correctly
      // handles dotted-suffix filenames (`*.exception.ts`, `*.interface.ts`,
      // etc. — most of this repo) without needing a TS-aware resolver.
      'n/file-extension-in-import': ['error', 'always'],
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
      // Disable nested param checking since TSDoc doesn't support dot notation
      'jsdoc/check-param-names': ['warn', { checkDestructured: false }],
      'tsdoc/syntax': 'error',

      // ESM tree-shaking: enforce `import type` for type-only imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
    },
  },

  // Spec and fixture files override
  {
    files: v8Packages.flatMap((name) => [
      `packages/${name}/src/**/*.spec.ts`,
      `packages/${name}/src/**/*.fixture.ts`,
    ]),
    rules: {
      '@darraghor/nestjs-typed/controllers-should-supply-api-tags': 'off',
      '@darraghor/nestjs-typed/api-method-should-specify-api-response': 'off',
      'jsdoc/tag-lines': 'off',
      'tsdoc/syntax': 'off',
    },
  },

  // `causal-context` is framework-agnostic by design — forbid framework
  // imports here so the boundary can't silently erode.
  {
    files: ['packages/nestjs-core/src/domain/events/causal-context/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', '@nestjs/**', '@concepta/*', '@concepta/**'],
              message:
                'causal-context is framework-agnostic — framework imports belong in the adapter layer (domain/events/*.ts, infrastructure/context/*.ts), not here.',
            },
          ],
        },
      ],
    },
  },
);
