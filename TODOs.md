# Ranked backlog

Single priority order (re-ranked 2026-10-16), ranked by (impact of leaving it undone)
vs (effort × blast radius): repository work first, then test flakes, then the rest.
Effort tags: S/M/L. Completed items are removed from this list rather than marked
done — see git history for what shipped. Reference notes that are not work live under
"Parked" at the end.

  1. **Row scope cannot see the tables a view reads** (S) — row scope compares
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

  2. **`@Transactional` e2e specs fail intermittently under full-suite parallel load** (M)
      — observed in `nestjs-cache`, `nestjs-crud`, `nestjs-role` and `nestjs-user`, and in
      crud's optimistic-locking e2e. Every one passes in isolation and on a re-run of the
      same suite. Seen as a `SQLITE_CONSTRAINT: UNIQUE` on a fixture row and as
      `TransactionScopeFailedException` after a timeout. The cache fixture's key collision
      was one cause of the UNIQUE sightings and is fixed (`db40e66e`); see whether any
      remain before chasing them here. The cost of leaving it is
      that a red suite goes green on retry, which trains everyone to re-run rather than
      look — so a genuine regression in a transactional path would be dismissed as this.
      Every spec opens its own `:memory:` SQLite database, so workers share no database
      file; suspect timeouts under CPU contention. Confirm by pinning a failing spec to a
      single worker.

  3. **Investigate zod 4.5.x's OpenAPI `$ref`/`$defs` hoisting change** — all packages
      that depend on zod are pinned to `~4.4.3` (both the published range and a
      `pnpm-workspace.yaml` override) because 4.5.0 changes `z.toJSONSchema()`'s `$ref`
      hoisting in a way that breaks nestjs-crud's OpenAPI tests
      (`swagger-request-body.spec.ts`, `petstore.spec.ts`). A live correctness gap, not
      just cleanup — either fix nestjs-crud's hoisting logic to handle the new output
      correctly, or confirm 4.5.x's behavior is actually fine and the tests need
      updating, then widen the range back.

# Parked

Not ranked: reference notes, and work waiting on something else.

  * **Map common database errors to useful exceptions** — a failed query surfaces as
      `RepositoryDatabaseException`, which carries the raw `context.database` (the
      driver's data-source type) and `context.code`, but nothing classifies them. So a
      unique-key race in `CreateFileCommand` (two creates pass the duplicate check; the
      second fails on the unique constraint) reaches the caller as a generic database error
      instead of `FileAlreadyExistsException`; the file README documents this. Idea: the
      driver reports a driver-neutral classification next to the code
      (`violation?: 'unique' | 'foreign-key' | ...`), and the abstraction throws a
      dedicated exception a module can catch without knowing database codes. Unique-violation
      codes: Postgres/CockroachDB `'23505'`, SQLite `'SQLITE_CONSTRAINT_UNIQUE'`
      (`'SQLITE_CONSTRAINT_PRIMARYKEY'` for a primary key), MySQL/MariaDB `'ER_DUP_ENTRY'` /
      errno `1062`, SQL Server `2627`/`2601` (on `number`, which `describeDatabaseError`
      doesn't read yet). Only SQLite is testable locally. Waiting on a second module that
      needs it.

  * `@concepta/nestjs-common` is deprecated — reverted to v7 line (`7.0.0-alpha.10`) and excluded from the v8 workspace. Its remaining v8-only symbols were merged into nestjs-core. Run `npm deprecate @concepta/nestjs-common@8.0.0-alpha.6` at publish time.
  * **Logger family is deprecated, not migrated** — `@concepta/nestjs-logger`,
      `nestjs-logger-sentry` and `nestjs-logger-coralogix` stay on the v7 line and are
      excluded from the "migrate to NestJS 12" checklist below. Replacement: `nestjs-pino`
      (Nest 12 supported), with pino transports as the plugins: `pino-sentry-transport`,
      `pino-opentelemetry-transport` (Coralogix's own SDK `coralogix-logger` is deprecated
      upstream), or a custom `pino-abstract-transport` sink for a local database. v8
      packages log through Nest's `Logger`, so they need no change. Remaining work:
      1. Run `npm deprecate` on all three packages, with a message pointing to `nestjs-pino`.
      2. Replace the `nestjs-samples` `02-logger` sample with a `nestjs-pino` recipe:
         `LoggerModule.forRoot({ pinoHttp })`, `bufferLogs: true`,
         `app.useLogger(app.get(Logger))`.
  * **`@concepta/nestjs-email` is deprecated, not migrated** — it stays on the v7 line and
      is excluded from the "migrate to NestJS 12" checklist below. It only forwards
      `sendMail` to an injected mailer and wraps the error; v8 packages already send through
      notification ports (`InvitationNotificationPort`, `VerifyNotificationPort`, the
      recovery port), whose command handlers the implementer writes for any channel.
      Replacement: `@nestjs-modules/mailer` (3.x, Nest 12 accepted; templates and an
      optional BullMQ queue) or `nodemailer` directly, called from those handlers.
      Remaining work:
      1. Run `npm deprecate` on `@concepta/nestjs-email`, with a message pointing to the
         notification ports and `@nestjs-modules/mailer`.
      2. Replace the `nestjs-samples` `04-email` sample with a recipe: a command handler
         for the invitation port that sends through `@nestjs-modules/mailer`'s
         `MailerService`.
  * Non-v8 packages (everything under `packages/` not listed under the v8 block in `pnpm-workspace.yaml`) are install-only workspace members until migrated to the DDD pattern and NestJS 12 — see the install-only block in `pnpm-workspace.yaml` for the full list.
  * **Request context on WebSocket** — HTTP and (preview) RPC are supported; on
      WebSocket, overlays skip and `@Ctx()`/`@Transactional()` throw. Design when
      wanted: a connection context on the socket client (identity, attached once)
      plus a fresh child per message, carried in the args array before the WS
      pattern, proven by a real gateway e2e. gRPC call-stream handlers could share
      it. No AsyncLocalStorage: context is passed explicitly so nothing ambient
      leaks across calls.
  * **Sorting by a to-one federated relation** — refused, like every sort by a
      federated relation; only the to-one case is worth designing.
      Exact design when wanted: read the related rows already sorted by value with
      the related key as tie-breaker and nulls at a fixed end, check each candidate
      root against the root's filter and row scope, and stop by the Threshold
      Algorithm's rule (Fagin 2001) once the page is full. Cursor paging costs about
      one page of reads; offset paging grows with page depth. The old relation-first
      loop was not a base for it: it stopped on the wrong condition, counted `skip`
      in related rows, and capped silently.
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
