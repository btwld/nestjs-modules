# Current scope
  * `@concepta/nestjs-common` is deprecated — reverted to v7 line (`7.0.0-alpha.10`) and excluded from the v8 workspace. Its remaining v8-only symbols were merged into nestjs-core. Run `npm deprecate @concepta/nestjs-common@8.0.0-alpha.6` at publish time.
  * Non-v8 packages (everything under `packages/` not listed under the v8 block in `pnpm-workspace.yaml`) are install-only workspace members until migrated to the DDD pattern and NestJS 12 — see the install-only block in `pnpm-workspace.yaml` for the full list. Also removed `@concepta/nestjs-email` from devDependencies in nestjs-invitation and nestjs-authentication (only used in e2e tests — restore when nestjs-email is migrated).

# Ranked backlog

Single priority order across everything below (Fable review, 2026-08-30), ranked by
(impact of leaving it undone) vs (effort × blast radius) — not grouped by the old
Critical/High/Nice-To-Have labels, which were rough guesses and sometimes wrong. Effort
tags: S/M/L. Completed items are removed from this list rather than marked done — see
git history for what shipped.

  1. **Investigate zod 4.5.x's OpenAPI `$ref`/`$defs` hoisting change** — all packages
      that depend on zod are pinned to `~4.4.3` (both the published range and a
      `pnpm-workspace.yaml` override) because 4.5.0 changes `z.toJSONSchema()`'s `$ref`
      hoisting in a way that breaks nestjs-crud's OpenAPI tests
      (`swagger-request-body.spec.ts`, `petstore.spec.ts`). A live correctness gap, not
      just cleanup — either fix nestjs-crud's hoisting logic to handle the new output
      correctly, or confirm 4.5.x's behavior is actually fine and the tests need
      updating, then widen the range back.

  2. **Tutorial Topics** — Support of the minimum interface; Provider Overrides. Docs
      work; sequence after the API stabilizes.

  3. **When non-v8 packages are migrated to NestJS 12** — not actionable until triggered.
      Full restore checklist per package:
      1. `pnpm-workspace.yaml` — move the dir from the install-only block to the v8
         `packages` list (or collapse both blocks to a single `packages/*` glob when all
         are migrated), and remove `"private": true` from the package manifest
      2. Root `tsconfig.json` `references` — add `{ "path": "packages/<pkg>" }` (this
         alone drives both the `tsc -b` ESM build and the type-check gate — the build is
         solution-file-driven)
      3. `vitest.config.ts` `test.include` — add `"packages/<pkg>/**/*.spec.ts"`
      4. `vitest.config-e2e.ts` `test.include` — add `"packages/<pkg>/**/*.e2e-spec.ts"`
      5. Restore `@concepta/nestjs-email` to nestjs-authentication and nestjs-invitation
         devDependencies once nestjs-email is migrated.
