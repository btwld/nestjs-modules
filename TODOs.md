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

  2. **Cascaded writes bypass row scope** — `repository.save()` honours TypeORM's `cascade`
      on a relation, so a write reaches the related table without entering that entity's
      repository. Its row-scope resolver never runs, and the adapter's own pre-write checks
      only ever saw the entity that was called. Reproduced: a scoped write on a child
      carrying `{ parent: { id: <other tenant's> } }` overwrote and re-tenanted the parent,
      with no refusal. Documented as a prohibition in the driver README, but nothing
      enforces it. A boot check would need `cascade` on
      `RepositoryRelationMetadataInterface` (not there today) plus driver support;
      alternatively the adapter could reduce nested relation objects to their identifying
      columns before saving. Decide which.

  3. **Export the helpers a live CRUD controller needs, or document the builder as the
      only path** (S) — `nestjs-crud`'s own tests and its `petstore` example wire
      hand-written CRUD controllers with `createCrudAdapterProvider`, `createQueryHandler`
      and `createCommandHandler`, imported by deep relative path
      (`../application/utils/create-operation-handlers.js`,
      `../infrastructure/utils/create-crud-adapter-provider.js`). **None of the three is
      exported from `src/index.ts`**, so an external adopter cannot reproduce the pattern the
      package demonstrates by example. The path that does work is
      `CrudModule.forFeature({ crud: … })`, discoverable only by reading `crud.module.ts`.
      Either export the three helpers or make `forFeature` the documented path and stop
      showing the hand-written style in examples adopters will copy. Found by the row-scope
      DX study, which hit this while building a CRUD surface over a scoped entity.

  4. **`create` with a partial composite primary key is a 500, not a 400** (S) — on an
      entity whose composite key has a column with a database default, omitting that column
      on `create` produces HTTP 500: `RepositoryQueryException` /
      `REPOSITORY_QUERY_ERROR`, message "Error while trying to query the X repository",
      cause `"Cannot update entity because entity id is not set in the entity."` Three
      problems: a 500 for what is bad input; a cause saying *update* for a call to
      `create`, which reads as a create being routed into an update (the bug class the row
      scope reviews hunted); and no column named, when the fix is "supply `locale`".
      Reproducible with **no row scope at all** — `assertNotExisting` deliberately skips a
      partial key and leaves it to the database, and this is what that looks like from
      outside. The `upsert` path already refuses the same mistake with a clear 400, so the
      shape to copy exists; `assertNotExisting` already computes the primary columns, so a
      400 naming the missing ones is cheap.

  5. **A relation from an unscoped entity into a scoped one defeats row scope on reads**
      — a `join` (or a `Where.rel()` filter) is resolved by the driver in one statement, so
      the joined entity's resolver never runs. That is safe where every scoped entity carries
      its own scope column and each resolver checks the foreign keys it owns on write, because
      scope integrity is then established on write and reads inherit it. It is *not* safe when
      an unscoped entity holds a relation into a scoped one: nothing checks the unscoped side,
      so a join through it reads rows the caller's scope would have excluded. Reproduced three
      ways — reading another tenant's rows through a public side-table, using `Where.rel()` as
      a search oracle, and planting a public row against a guessed id. **Accepted as a schema
      design responsibility**, not enforced: the framework's guarantee is that a resolver runs
      at every repository entry point, and a join is not one. Documented in the row-scope
      README. Revisit only if a deployment needs it policed — the options were a symmetric
      boot check (forces a declaration on anything relating to a scoped entity) or injecting
      the joined entity's predicate as relation-tagged conditions (no driver change needed,
      but a LEFT join then drops roots whose related row is invisible).

  6. **Tutorial Topics** — Support of the minimum interface; Provider Overrides. Docs
      work; sequence after the API stabilizes.

  7. **When non-v8 packages are migrated to NestJS 12** — not actionable until triggered.
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
