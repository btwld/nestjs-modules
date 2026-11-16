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

  2. **`@Transactional` e2e specs may still fail under full-suite parallel load** (M) —
      the 401/404 sightings were requests reaching another process on a shared port, fixed
      by supertest 7.3.1. Not yet explained: a `SQLITE_CONSTRAINT: UNIQUE` on a fixture row
      and `TransactionScopeFailedException` after a timeout, seen in `nestjs-cache`,
      `nestjs-crud`, `nestjs-role` and `nestjs-user`. Every spec opens its own `:memory:`
      SQLite database, so suspect timeouts under CPU contention; confirm by pinning a
      failing spec to a single worker. Drop this item if neither recurs. Leaving it trains
      everyone to re-run a red suite rather than look.

  3. **Investigate zod 4.5.x's OpenAPI `$ref`/`$defs` hoisting change** — all packages
      that depend on zod are pinned to `~4.4.3` (both the published range and a
      `pnpm-workspace.yaml` override) because 4.5.0 changes `z.toJSONSchema()`'s `$ref`
      hoisting in a way that breaks nestjs-crud's OpenAPI tests
      (`swagger-request-body.spec.ts`, `petstore.spec.ts`). A live correctness gap, not
      just cleanup — either fix nestjs-crud's hoisting logic to handle the new output
      correctly, or confirm 4.5.x's behavior is actually fine and the tests need
      updating, then widen the range back.

  4. **errorCodes without the `_ERROR` suffix** (S, wire-visible) — the convention is
      that every `errorCode` ends in `_ERROR` (user, 2026-11-14). About 55 v8 codes
      don't: core 13 (`HOOK_NOT_DECORATED`, `OVERLAY_*`, `CURRENCY_*`, `MONEY_*`,
      `APP_CONTEXT_UNAVAILABLE`, `RUNTIME_EXCEPTION`), repository 29 (`ENTITY_NOT_FOUND`,
      `ROW_SCOPE_*`, `TRANSACTION_*`, `*_BOOT_CHECK_FAILED`, ...), TypeORM driver 4,
      Drizzle driver 2, user 3, otp 1, cache 1, crud 1. Rename in one sweep, with the
      tests and READMEs that name them; list them with
      `grep -rhoE "errorCode = '[A-Z_]+'" packages/*/src | grep -v "_ERROR'"`.

  5. **One meaning for "public route"** (M, DX) — "public" means different things
      depending on who reads it (user, 2026-11-15). Review them and settle on one
      notion every module reads the same way. Today:
      - core's `@PublicRoute()` is an audit mark only and opens nothing; core reads it with
        `isPublicRoute`;
      - authentication's `@AuthPublic()` turns off only guards built with
        `canDisable` (the JWT guard) and sets the mark. A guard that can't be turned off
        (`LocalGuard`, `RefreshGuard`) still authenticates, so a public route is not
        necessarily unauthenticated. It is read with a second check, `isAuthPublic`, and
        `@PublicRoute()` alone does not open the JWT guard;
      - `{ optional: true }` is public, yet signs a valid caller in. `{ classLevel:
        true }` only silences a warning emitted on every request;
      - `settings.guards.enable: false` and the `settings.guards.disable` callback open
        routes with no mark at all;
      - the route audit reads the mark three ways. `requireAuth` and `requireAcl` skip
        a marked route, so a missing grant there isn't caught. `requirePrivateWrites`
        treats the mark as anonymous, so a credentialed refresh or sign-in needs an
        `allow` entry;
      - at runtime a grant on a public route still runs and refuses a caller with no
        actor. Off HTTP, `@AuthPublic()` is the only way past the JWT guard.

      Questions to settle:
      - Are "open on purpose" (audit), "no sign-in required" (authentication) and "no
        grant required" (access control) one concept or three?
      - Should a guard that authenticates on its own (sign-in, refresh) be a distinct,
        named kind of route rather than public plus an `allow` entry?
      - Should the `disable` callback have to mark what it opens?
  6. **Field-scoped allows on calls that name no fields** (S, security) — an allow
      naming `fields` allows the whole call when that call names no columns (user,
      2026-11-15). CASL counts a field-scoped allow on a check without a field, so
      `{ action: 'delete', subject: 'order', fields: ['status'] }` allows the whole
      delete, and the same goes for `softDelete`, `restore` and a domain operation
      asserted with `assertAuthority`. Decide whether `authorityRuleProblems` should
      refuse `fields` on actions that ask no columns, whether such an allow should count
      only when the call names one of its fields, or whether today's behaviour stays and
      is documented as the rule.

# Parked

Not ranked: reference notes, and work waiting on something else.

  * **Map common database errors to useful exceptions** — a failed query surfaces as
      `RepositoryDatabaseException`, which carries the raw `context.database` (the
      driver's data-source type) and `context.code`, but nothing classifies them. Idea: the
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
