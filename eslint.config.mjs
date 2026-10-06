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

// Guard the optional/* entry-point boundary (see the root README's Entry
// Points section): an optional peer dependency may only be imported from the
// source backing that dependency's optional/* entry point, or from tests and
// fixtures. `nestjs-repository-typeorm` and `nestjs-crud` are exempt — they
// are the TypeORM driver and the CRUD framework these entry points build on,
// so restricting them from importing their own reason for existing is
// pointless.
const optionalDepFreePackages = ['nestjs-repository-typeorm', 'nestjs-crud'];
const optionalDepRestrictedPackages = v8Packages.filter(
  (name) => !optionalDepFreePackages.includes(name),
);
const optionalDepRestrictedFiles = optionalDepRestrictedPackages.map(
  (name) => `packages/${name}/src/**/*.ts`,
);
const optionalDepAllowedFiles = optionalDepRestrictedPackages.flatMap(
  (name) => [
    `packages/${name}/src/gateways/http/**/*.ts`,
    `packages/${name}/src/infrastructure/persistence/typeorm/**/*.ts`,
    `packages/${name}/src/infrastructure/seeding/**/*.ts`,
    `packages/${name}/src/infrastructure/schemas/*-paginated.schema.ts`,
    `packages/${name}/src/infrastructure/schemas/*-create-batch.schema.ts`,
    `packages/${name}/src/**/__tests__/**/*.ts`,
    `packages/${name}/src/**/__fixtures__/**/*.ts`,
    `packages/${name}/src/**/*.spec.ts`,
    `packages/${name}/src/**/*.fixture.ts`,
  ],
);

// `regex` (not `group`) — `group` uses gitignore-style matching via the
// `ignore` package, which is unanchored: a pattern like `typeorm/**` matches
// ANY path with a `typeorm` path segment, including our own relative import
// `./infrastructure/persistence/typeorm/cache-sqlite.entity.js` from inside
// optional-typeorm.ts. `regex` is tested with `RegExp#test` against the raw
// import source, so anchoring with `^...$` matches only the bare specifier
// or a subpath of it (`typeorm`, `typeorm/browser`), never a relative path.
const optionalDepPattern = (name, message) => ({
  regex: `^${name}(/.*)?$`,
  message,
});
const OPTIONAL_DEP_RESTRICTED_PATTERNS = [
  optionalDepPattern(
    '@concepta/nestjs-crud',
    "Only the optional/crud entry point may import this (src/gateways/http/**, *-paginated.schema.ts, *-create-batch.schema.ts) — see the root README's Entry Points section.",
  ),
  optionalDepPattern(
    '@concepta/nestjs-repository-typeorm',
    "Only the optional/typeorm entry point may import this (src/infrastructure/persistence/typeorm/**) — see the root README's Entry Points section.",
  ),
  optionalDepPattern(
    'typeorm',
    "Only the optional/typeorm entry point may import this (src/infrastructure/persistence/typeorm/**) — see the root README's Entry Points section.",
  ),
  optionalDepPattern(
    '@concepta/typeorm-seeding',
    "Only the optional/seeding entry point may import this (src/infrastructure/seeding/**) — see the root README's Entry Points section.",
  ),
  optionalDepPattern(
    '@faker-js/faker',
    "Only the optional/seeding entry point may import this (src/infrastructure/seeding/**) — see the root README's Entry Points section.",
  ),
];

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

  // optional/* entry-point boundary — restrict, then re-allow where expected
  {
    files: optionalDepRestrictedFiles,
    rules: {
      'no-restricted-imports': ['error', { patterns: OPTIONAL_DEP_RESTRICTED_PATTERNS }],
    },
  },
  {
    files: optionalDepAllowedFiles,
    rules: {
      'no-restricted-imports': 'off',
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
