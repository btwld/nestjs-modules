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

  3. **`@Transactional` e2e specs fail intermittently under full-suite parallel load** (M)
      — observed in `nestjs-cache`, `nestjs-crud`, `nestjs-role` and `nestjs-user`. Every
      one passes in isolation and on a re-run of the same suite, so it is a shared-resource
      condition under concurrency rather than four unrelated bad tests. Seen as a
      `SQLITE_CONSTRAINT: UNIQUE` on a fixture row and as
      `TransactionScopeFailedException` after a timeout. The cost of leaving it is that a
      red suite goes green on retry, which trains everyone to re-run rather than look —
      so a genuine regression in a transactional path would be dismissed as this.
      Suspect per-worker database isolation or fixture seeding shared across workers;
      confirm by pinning the failing spec to a single worker.

  4. **`Join.inner()` is refused on the TypeORM driver rather than implemented** (M) —
      TypeORM's `relations` find option always renders a LEFT JOIN, so the driver cannot
      honour an `INNER` clause. It now throws (`fault: 'usage'`) rather than silently
      returning the rows the caller asked to exclude, which was a wrong answer with no
      signal. Federation is unaffected: it implements `INNER` itself by requiring the
      related row to exist, and strips federated joins from the root options before the
      driver sees them. Do it if a consumer needs INNER on a non-federated relation; until
      then the refusal is the honest behaviour. Two routes if it is ever wanted: inject a
      `NOT_NULL` predicate on the related entity's key into every AND-branch of the
      `WHERE`, since a LEFT join plus a predicate on the joined column already excludes
      non-matching roots — cheaper, but it has to respect the `never` and empty-compound
      invariants in `toDnf`; or route joined reads through TypeORM's QueryBuilder instead
      of `relations`, which is correct for every join shape but changes the driver's whole
      read path. The first was not explored when this was deferred.

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

  7. **A scope value typed unlike its column is a silent trap, and nothing documents it**
      (S) — resolve `'42'` against an integer `tenantId` and the database compares the two
      equal while row scope's post-read check does not, so every read succeeds and every
      write 404s. It fails closed and it is loud on first run, which is why a diagnostic
      was deliberately rejected: it would have put a `String()`-based loose compare next to
      the strict compare that is the actual security decider. A sentence in the row-scope
      README naming the symptom is the whole fix.

  8. **Nothing stops a row-scope resolver regressing to `RowScopeBase<PlainLiteralObject>`**
      (S) — naming the entity in both type parameters is what makes `column` checked
      against the entity's real columns, turning a misspelling into a compile error instead
      of a boot failure. The fixtures were the worked examples and had all drifted to the
      weaker form, which also produced a wrong review finding when they were read as the
      reference instead of the README. A lint rule or a type-level nudge would hold the
      line; until then it relies on review.

  9. **`console.log` in the crud README's hook examples** (S) — against the project's own
      rule, and README examples get copied verbatim into consumer code where the shipped
      ESLint config then rejects them. The hook section now injects a `Logger`; the rest of
      the file was left alone because fixing it properly is a sweep across every package's
      README rather than one example.

  10. **When non-v8 packages are migrated to NestJS 12** — not actionable until triggered.
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
