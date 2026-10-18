# Ranked backlog

Single priority order (re-ranked 2026-10-16), ranked by (impact of leaving it undone)
vs (effort × blast radius): repository work first, then test flakes, then the rest.
Effort tags: S/M/L. Completed items are removed from this list rather than marked
done — see git history for what shipped. Reference notes that are not work live under
"Parked" at the end.

  1. **Federation gaps** (M) — **on hold, to revisit as a whole against the repository
      direction** (don't extend federation or use it to satisfy a guarantee). The
      orchestrator finds a related repository by entity class name, and that index
      keeps the last registration without complaint, so two distinct entities with
      the same class name (different databases or tables) federate through whichever
      registered last. It
      also ignores `through`, so a federated many-to-many hydrates the wrong rows; and
      a peer's conditions and sort keep the root's relation tag, which TypeORM then
      resolves as a property the peer lacks (`EntityPropertyNotFoundError`). Only
      `findAndCount` federates; `find`, `findOne` and `count` join in the database.
      Conflicts with the repository direction, to weigh when it resumes:
      - `findAndCount` with a federated join skips the permeator, row scope and
        `assertReadable` on entry. It relies on the orchestrator re-entering public
        methods.
      - Hydration adds relation properties and `null`/`[]` defaults that no driver
        returned, so the result check must decide whether a federated relation counts
        as joined.
      - A missing `take` is silently capped at 10, and `getRootTotal` can return
        `MAX_SAFE_INTEGER`.
      - A `select` without `on.from` silently leaves relations un-hydrated.
      - Sorting by a federated relation injects a not-null filter, so the sort drops
        roots with no related row. On an owning relation that filter is on the root's
        own foreign key, which keeps a root whose related row was soft-deleted.
      - The TypeORM driver merges `relationsConfig` into the metadata it reports.
      - crud's paginated type carries the federation-only `metrics`.

  2. **Row scope cannot see the tables a view reads** (S) — row scope compares
      URNs, and a view entity's URN names the view, not the tables it selects
      from. `@ViewEntity({ name: 'open_orders', expression: 'SELECT … FROM
      orders …' })` is `urn:typeorm:shop:open_orders` while a scoped `Order` is
      `urn:typeorm:shop:orders`, so an unscoped `OpenOrder` reads every scope's
      orders and is neither refused as a duplicate registration nor as a
      relation into scoped rows. The same holds for a SQLite file named by two
      paths (`./app.sqlite` and `/srv/app.sqlite` give different URNs).
      Documented in the driver README as the implementer's to scope. Closing it
      would need the driver to know which tables a view expression reads, and
      to resolve SQLite paths.

  3. **`nestjs-cache`'s `GET /cache/user` e2e collides on a unique constraint, ~4% of runs**
      (S) — `UserCacheFactoryFixture` sets `key = faker.person.jobArea()`, drawn from roughly
      25 values, with constant `type` and `assigneeId`, and the spec calls `createMany(2)`
      against `@Unique(['key', 'type', 'assigneeId'])`. Two draws therefore collide about
      1 time in 25, independently of TypeORM version or worker concurrency — confirmed by
      8 consecutive passes after one failure, with no other change. Make `key` unique per
      iteration. This is a **different cause** from the parallel-load item below and may
      account for its nestjs-cache `SQLITE_CONSTRAINT: UNIQUE` sightings, so fixing it
      first narrows that investigation.

  4. **`@Transactional` e2e specs fail intermittently under full-suite parallel load** (M)
      — observed in `nestjs-cache`, `nestjs-crud`, `nestjs-role` and `nestjs-user`, and in
      crud's optimistic-locking e2e. Every one passes in isolation and on a re-run of the
      same suite. Seen as a `SQLITE_CONSTRAINT: UNIQUE` on a fixture row (likely item 3)
      and as `TransactionScopeFailedException` after a timeout. The cost of leaving it is
      that a red suite goes green on retry, which trains everyone to re-run rather than
      look — so a genuine regression in a transactional path would be dismissed as this.
      Every spec opens its own `:memory:` SQLite database, so workers share no database
      file; suspect timeouts under CPU contention. Confirm by pinning a failing spec to a
      single worker.

  5. **Investigate zod 4.5.x's OpenAPI `$ref`/`$defs` hoisting change** — all packages
      that depend on zod are pinned to `~4.4.3` (both the published range and a
      `pnpm-workspace.yaml` override) because 4.5.0 changes `z.toJSONSchema()`'s `$ref`
      hoisting in a way that breaks nestjs-crud's OpenAPI tests
      (`swagger-request-body.spec.ts`, `petstore.spec.ts`). A live correctness gap, not
      just cleanup — either fix nestjs-crud's hoisting logic to handle the new output
      correctly, or confirm 4.5.x's behavior is actually fine and the tests need
      updating, then widen the range back.

  6. **TypeORM is pinned below 1.1, so consumers cannot use `typeorm@latest`** (M) — the
      driver's peer range is `^0.3.31 || ~1.0.0`, but `typeorm@latest` is 1.1.x and 0.3 is
      tagged `legacy` upstream, so `npm i typeorm` gets a version we refuse. The blocker is
      deliberate upstream behaviour rather than a bug: from 1.1.0, `count` and `findAndCount`
      count DISTINCT values of the *selected* columns whenever find options carry a `select`
      (typeorm PR #11965, "feat: support distinct count"), so a projected paginated query
      reports a distinct count where it used to report a total — measured on better-sqlite3,
      100 rows with `select: { isActive }` counted as 2. crud's list passes `select` into
      `findAndCount`, so its totals break. The fix keeps the projection out of the count:
      the driver splits `doFindAndCount` into a find plus a count without `select`.
      After that, widening the range is a change of its own. Re-check on each TypeORM release whether
      `findAndCount`'s documented entity-count contract is restored.

      The `~1.0.0` pin also accepts a known advisory: GHSA-2rp8-mm9q-fp49 /
      CVE-2026-73651 (medium) affects `>= 1.0.0, < 1.1.0`, and 1.1.0 is the only patched
      1.x. Accepted deliberately — the vector is template-literal injection in
      `migration:generate`, a dev-time codegen command that nothing in this repo invokes,
      so the exposure is a consumer who runs it against an untrusted schema. Landing the
      count fix above is what clears it.

# Parked

Not ranked: reference notes, and work waiting on something else.

  * `@concepta/nestjs-common` is deprecated — reverted to v7 line (`7.0.0-alpha.10`) and excluded from the v8 workspace. Its remaining v8-only symbols were merged into nestjs-core. Run `npm deprecate @concepta/nestjs-common@8.0.0-alpha.6` at publish time.
  * Non-v8 packages (everything under `packages/` not listed under the v8 block in `pnpm-workspace.yaml`) are install-only workspace members until migrated to the DDD pattern and NestJS 12 — see the install-only block in `pnpm-workspace.yaml` for the full list. Also removed `@concepta/nestjs-email` from devDependencies in nestjs-invitation and nestjs-authentication (only used in e2e tests — restore when nestjs-email is migrated).
  * **Request context on WebSocket** — HTTP and (preview) RPC are supported; on
      WebSocket, overlays skip and `@Ctx()`/`@Transactional()` throw. Design when
      wanted: a connection context on the socket client (identity, attached once)
      plus a fresh child per message, carried in the args array before the WS
      pattern, proven by a real gateway e2e. gRPC call-stream handlers could share
      it. No AsyncLocalStorage: context is passed explicitly so nothing ambient
      leaks across calls.
  * **Tutorial Topics** — Support of the minimum interface; Provider Overrides. Docs
      work; sequence after the API stabilizes.
  * **When non-v8 packages are migrated to NestJS 12** — not actionable until triggered.
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
