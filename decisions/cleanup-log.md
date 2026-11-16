# Clean-up log: session 1 (2026-11-15)

Baseline: `feature/version-8` at `0edf7508`. Scope: `.claude/` and Claude Code memory only. No
branch was created, nothing was deleted, and no repo file outside `.claude/` was touched
(`git status`: only `?? .claude/`). Session 2 moved this log from `.claude/plans/` to the root
`decisions/` (see section 9). Paths under `.claude/` and memory are local and untracked.

## 1. Backup
`.claude/backup/plans/` is a full copy of `.claude/plans/` as it was before any change (8 plans),
and `.claude/backup/CLAUDE.md` is a copy of `.claude/CLAUDE.md`. Verified with `diff -r`: identical.

## 2. Classification (approved by the user)

| Plan | Class | Action |
| --- | --- | --- |
| `access-auth-canonical-facts.md` | active | kept in place (primary extraction input) |
| `branch-followup-handoff.md` | active (mixed) | kept in place; done sections mined |
| `v7-to-v8-module-port.md` | active | kept in place (CLAUDE.md names it) |
| `branch-followup-review.md` | done | mined, moved |
| `branch-review-guide.md` | done | mined, moved |
| `object-authority-matrix-plan.md` | done (grant storage unbuilt) | mined, moved |
| `file-upload-safety-handoff.md` | done | mined, moved |
| `object-authority-matrix-handoff.md` | stale (superseded) | mined, moved |

## 3. Mined (`.claude/plans/mined/`, every record **proposed**)

| File | Records | Open questions |
| --- | --- | --- |
| `object-authority-matrix-plan.md` | 24 (OAM-01..24) | 4 |
| `branch-review-guide.md` | 8 (BRG-01..08) | 0 |
| `branch-followup-review.md` | 10 (BFR-01..10) | 2 |
| `branch-followup-handoff.md` | 9 (BFH-01..09) | 2 |
| `file-upload-safety-handoff.md` | 9 (FUS-01..09) | 1 |
| `object-authority-matrix-handoff.md` | 3 (OAMH-01..03) | 1 |

Each decision is recorded once, in the plan where it was made; the others point to it. Each
record cites `plan:line`, a commit, or a memory file.

**Re-raised findings baseline: 12** (`mined/reraised-findings-baseline.md`). 8 challenged a
specific earlier decision and 4 were closed by a standing rule. The same unknown-vs-unreadable
column decision was raised 3 times, and cascade atomicity and ordering 3 times.

## 4. Moves (into `.claude/backup/`, with `mv -n`)
- `plans/branch-followup-review.md` → `backup/branch-followup-review.md`
- `plans/branch-review-guide.md` → `backup/branch-review-guide.md`
- `plans/object-authority-matrix-plan.md` → `backup/object-authority-matrix-plan.md`
- `plans/file-upload-safety-handoff.md` → `backup/file-upload-safety-handoff.md`
- `plans/object-authority-matrix-handoff.md` → `backup/object-authority-matrix-handoff.md`
  (after the user granted the write for its mined file)

## 5. Memory corrections
Each one was checked against the code at `0edf7508`, and each edit was made with the Edit tool.

| File | Was | Now | Why |
| --- | --- | --- | --- |
| `file-upload-safety.md` | "Not yet pushed/PR'd"; handoff in `.claude/plans/` | on `feature/version-8` (pushed), incl. `9b86651a`; handoff in backup; points to mined records | `9b86651a` is an ancestor of `0edf7508` |
| `v7-port-readiness.md` | nestjs-file statuses `pending \| active \| removing \| remove-failed` | the eight `FILE_STATUSES` | `domain/interfaces/file-status.type.ts` |
| `v7-port-readiness.md` | "Duplicate check reads `withDeleted: true`" | no duplicate-name check (keyed by id) | the lifecycle service has no name check; `withDeleted` reads are restore and removal |
| `v7-port-readiness.md` | "`GetFileByKeyQuery` returning null is the user's decision" | gone; `GetFileQuery` and `GetFileDownloadQuery` | only those two queries exist |
| `access-control-overhaul.md` | plan and handoff in `.claude/plans/`, with no merged status | merged at `0edf7508`; plan in backup; mined ids; only grant storage unbuilt | merge commit |
| `access-control-overhaul.md` | "The user will review the branch in chunks…" | reviewed, finished 2026-11-13 | review guide #1–#10 committed |
| `access-control-overhaul.md` | `reason` = pending decision (gate) in both layers | superseded by `pending: '<gate>'` | `b951edec`; core `authority-pending-gate.interface.ts` |
| `access-control-overhaul.md` | `authority` option `{ decider, except? }`; review-guide path | `{ authority, except? }`; backup path | no `decider` in access-control src |
| `feedback-review-walkthrough-format.md` | applies to `.claude/plans/branch-review-guide.md` | any chunked review (the guide is retired) | moved |
| `MEMORY.md` | access-control line "phasing core→CRUD→authority→audit" | "merged at 0edf7508, only nestjs-role grant storage unbuilt" | merge |

Checked and left as is:
- v7 mentions (8 files). They match the code: `nestjs-common`, `nestjs-logger` and
  `nestjs-report` are still v7 packages.
- Lerna/Yarn: no hits.
- `nestjs-auth-*` in `auth-consolidation.md`: accurate, still pre-v8.
- `repository-settled-decisions.md` `forRoot({ drivers })`: true at `0edf7508`; the rename is
  session 2.

After the edits:
- every `MEMORY.md` link resolves;
- no memory names a moved plan by its old path.

## 6. Pending
- **Retired old framework name**: not identified in memory. The user is to name it.

## 7. claude.ai Project plans
The user saved `v8-roadmap.md`, `v8-decisions-and-invariants-plan.md` and
`v8-agent-skills-plan.md` to an untracked `handoff-plans/` folder at the repo root. They were
moved into `.claude/plans/` (with `mv -n`, no clashes), and the empty folder was removed at the
user's request. Nothing was committed.

## 8. The retired framework name

Rule (user, 2026-11-15): the name is retired in every casing and form. Memory prose is
reworded to neutral descriptions ("the v8 @concepta NestJS modules", "the modules"), and no
new name is invented. New text never uses it. Existing files and identifiers keep it for now;
renames are decided separately, from the inventory below.

### 8.1 Memory reworded (16 occurrences, 10 files)

| File | Was | Now |
| --- | --- | --- |
| `MEMORY.md:11` | an opinionated [name] helper | an opinionated helper in the modules |
| `MEMORY.md:58` | Anago × [name] fit analysis | Anago × modules fit analysis |
| `feedback-use-upstream-mechanisms.md:3` | an opinionated [name] helper | an opinionated helper in the modules |
| `feedback-use-upstream-mechanisms.md:13` | a [name] helper | a helper of our own |
| `feedback-use-upstream-mechanisms.md:17` | [name] `fault` | the modules' `fault` |
| `feedback-ddd-review.md:28` | [name] DDD distinction | The modules' DDD distinction |
| `feedback-ddd-review.md:34` | [name] modules | the v8 @concepta NestJS modules |
| `feedback-ddd-review.md:38` | [name]' JwtPort pattern | the modules' JwtPort pattern |
| `anago-rockets-fit.md:90` | [name] update = | modules update = |
| `durable-messaging-project.md:3` | in [name] v8 | in the v8 @concepta NestJS modules |
| `durable-messaging-project.md:13` | [name] ships | The modules ship |
| `anago-idempotency-findings.md:52` | [name] checklist status | Modules checklist status |
| `adapter-per-database.md:35` | [name]-side guards | module-side guards |
| `feedback-interface-own-file.md:3` | In [name], | In the v8 @concepta NestJS modules, |
| `feedback-framework-vs-implementer.md:3` | nestjs-repository/[name] v8 framework code | nestjs-repository and the other v8 @concepta NestJS modules |
| `optional-entry-point-boundary.md:11` | [name] v8 packages | The v8 @concepta NestJS packages |

Of the 32 occurrences in memory, these 16 were prose; the other 16 are identifiers (8.2).
Also fixed in my own text: the
`mined/file-upload-safety-handoff.md` open question now says "the Anago fit-analysis repo".

### 8.2 Memory identifiers left as is (16)
These are file or repo names, slugs, paths and code identifiers:
- the memory slug and file `anago-rockets-fit` (`anago-rockets-fit.md:2`; `MEMORY.md:58` link
  target), linked as `[[anago-rockets-fit]]` from `access-control-overhaul.md:103`,
  `anago-idempotency-findings.md:67`, `feedback-scope-substitution.md:39` and
  `subagent-extraction-caveats.md:31`;
- the repo `~/NetBeansProjects/anago-rockets-fit` (`anago-rockets-fit.md:11`,
  `file-upload-safety.md:11`);
- the report files `Anago_Rockets_Fit_Summary.md` and `Anago_Rockets_Fit_Report.html`
  (`anago-rockets-fit.md:20-21`);
- the repo path `~/NetBeansProjects/rockts/rockets` (`anago-rockets-fit.md:14`), which is also in
  the Claude Code memory directory's own path;
- `.claude/commands/rockets-ddd-reference.md` / `/rockets-ddd-reference`
  (`accounting-primitives.md:29`, `v7-port-readiness.md:12` ×2);
- the code identifiers `rockets.transaction_id` (`adapter-per-database.md:22`) and
  `ROCKETS_HOOKS_DUPLICATE` (`hook-registration.md:50`).

### 8.3 Untracked `.claude/` files (14 lines; `backup/` copies not counted)
```
.claude/CLAUDE.md:3: [name] is a monorepo of NestJS modules (`@concepta` scope) …
.claude/CLAUDE.md:5: ## [name] v8 Modules
.claude/CLAUDE.md:25: ## [name] v8 building
.claude/CLAUDE.md:38: ## [name] v8 testing
.claude/CLAUDE.md:96: ## [name] v8 Architecture
.claude/CLAUDE.md:100: - Use `/rockets-ddd-reference` skill for DDD patterns …
.claude/plans/v8-agent-skills-plan.md:11: > **Naming note:** the framework's old working name is retired … (names the identifiers)
.claude/plans/v7-to-v8-module-port.md:1: # Plan: port v7 modules to [name] v8
.claude/plans/v7-to-v8-module-port.md:4: … The port follows `/rockets-ddd-reference` …
.claude/plans/v7-to-v8-module-port.md:46: 7. `.claude/CLAUDE.md` "[name] v8 Modules": add …
.claude/commands/rockets-ddd-reference.md (the file name itself)
.claude/commands/rockets-ddd-reference.md:1: # [name] DDD / Clean Architecture Reference (v8)
.claude/commands/rockets-ddd-reference.md:3: How to write a [name] v8 module: …
.claude/commands/rockets-ddd-reference.md:40: Lint in the [name] repo enforces this boundary. …
```
The skill's name in the session's skill list (`rockets-ddd-reference`) comes from that file.
`.claude/backup/` holds copies of `CLAUDE.md` and the plans, with the same occurrences.

### 8.4 Tracked repo files (147 lines, 167 occurrences, 85 files; `git grep -i`)

**a. README prose and titles**
```
README.md:1: # [name]
README.md:3: ![[name] Logo](…/assets/rockets…)   (also an asset path)
README.md:39: | [nestjs-core](…) …   (occurrence in the row text)
packages/nestjs-auth-apple/README.md:1, 457
packages/nestjs-auth-github/README.md:1, 377
packages/nestjs-auth-google/README.md:1, 378
packages/nestjs-authentication/README.md:1548: … into the [name] `AppContextHost` …
packages/nestjs-common/README.md:3, 402, 472
packages/nestjs-common/src/exceptions/README.md:1
packages/nestjs-core/README.md:3, 4, 1558
packages/nestjs-email/README.md:1
packages/nestjs-event/README.md:1
packages/nestjs-federated/README.md:1, 159
packages/nestjs-invitation/README.md:1
packages/nestjs-logger/README.md:1
packages/nestjs-logger-coralogix/README.md:1
packages/nestjs-logger-sentry/README.md:1
packages/nestjs-org/README.md:1
packages/nestjs-report/README.md:1
packages/nestjs-repository-drizzle/README.md:461: … the runs other [name] modules open themselves …
packages/nestjs-repository-typeorm/README.md:665 (same sentence), 1196: … a [name] package's own write …
packages/nestjs-swagger-ui/README.md:1
```

**b. External documentation URLs (`www.rockets.tools/reference/rockets/…`)**
```
packages/nestjs-auth-apple/README.md:62, 440, 448
packages/nestjs-auth-github/README.md:49, 360, 368
packages/nestjs-auth-google/README.md:49, 361, 369
packages/nestjs-federated/README.md:46, 47, 48, 161, 162, 163
packages/nestjs-report/README.md:452
```

**c. Published package metadata (`package.json` "description", 25 files)**
```
access-control, auth-apple, auth-github, auth-google, authentication, cache, common,
core ("[name] App - Core framework module for [name] applications"), crud, email, event,
federated, file, invitation, logger, logger-coralogix, logger-sentry, org (says "User"),
otp, password, repository, repository-drizzle, repository-typeorm, role, swagger-ui, user
```
`typedoc.json:18`: `"name": "[name] Core Documentation"`.

**d. Runtime identifiers (renaming any of these is a breaking change)**
```
Warning codes (logged; documented in READMEs):
  ROCKETS_JWT_WEAK_SECRET    authentication jwt.policy.ts:27, 34; spec:61, 73; README:1220
  ROCKETS_JWT_SHARED_SECRET  authentication jwt.policy.ts:41; spec:87, 98; README:1221
  ROCKETS_JWT_NO_EXPIRY      authentication jwt.policy.ts:48, 55; spec:116, 130; README:1219
  ROCKETS_OTP_NO_RATE_LIMIT  authentication otp.policy.ts:37
  ROCKETS_AUTH_PUBLIC_CLASS_LEVEL  authentication auth.guard.ts:111
  ROCKETS_HOOKS_NOT_WIRED    repository repository-adapter.ts:168; hooks-warning spec:24; core README:175
  ROCKETS_HOOKS_DUPLICATE    repository repository-adapter.ts:3040; hook-registration spec:242; README:1801
Event key prefix:
  'ROCKETS_EVENT_'           nestjs-event event-constants.ts:21; event-constants.spec.ts:35
Database session key (SQL Server):
  'rockets.transaction_id'   repository-typeorm sqlserver/typeorm-sqlserver.constants.ts:13
                             (TYPEORM_SQLSERVER_TRANSACTION_ID_KEY); transaction spec:53, 65;
                             README:902, 925 (in the RLS predicate implementers copy)
```

**e. Code comments and local names**
```
packages/nestjs-core/src/domain/enums/operation.enum.ts:2: … across the [name] ecosystem.
packages/nestjs-common/src/enums/operation.enum.ts:2: (same; v7 package)
packages/nestjs-crud/src/__tests__/petstore/petstore.spec.ts:274 (comment), 307, 308, 321, 328 (`rocketsOp`, `rocketsProps`)
```

**f. Test and dev infrastructure**
```
docker/compose.test.yml:2 (project name rockets-test), 10, 16, 25, 42 (database rockets_test)
docker/compose.test-oracle.yml:2 (rockets-test-oracle), 10, 11 (APP_USER / password)
docker/compose.test-sqlserver.yml:2 (rockets-test-sqlserver), 12 (password Rockets-Test-1), 22 (rockets_test ×2)
.devcontainer/devcontainer.json:15 (service "rockets")
.devcontainer/docker-compose.yml:4, 8 (service), 9 (image maz37/rockets-node), 31 (volume)
packages/nestjs-repository-typeorm/src/__fixtures__/rls/rls-database.fixture.ts:9
packages/nestjs-repository-typeorm/src/__fixtures__/session-context/session-context-database.fixture.ts:17, 18
packages/nestjs-repository-typeorm/src/__fixtures__/vpd/vpd-database.fixture.ts:8 (OWNER = 'rockets')
packages/nestjs-repository-typeorm/src/mariadb/__tests__/typeorm-mariadb-conformance.docker-spec.ts:11
packages/nestjs-repository-typeorm/src/mariadb/__tests__/typeorm-mariadb-durable.docker-spec.ts:45
packages/nestjs-repository-typeorm/src/mysql/__tests__/typeorm-mysql-conformance.docker-spec.ts:11
packages/nestjs-repository-typeorm/src/oracle/__tests__/typeorm-oracle-conformance.docker-spec.ts:11, 12
packages/nestjs-repository-typeorm/src/postgres/__tests__/typeorm-postgres-conformance.docker-spec.ts:14
packages/nestjs-repository-typeorm/src/postgres/__tests__/typeorm-postgres-delete-lock.docker-spec.ts:52
packages/nestjs-repository-typeorm/src/sqlserver/__tests__/typeorm-sqlserver-conformance.docker-spec.ts:15, 16
packages/nestjs-repository-drizzle/src/mariadb/__tests__/drizzle-mariadb-conformance.docker-spec.ts:11
packages/nestjs-repository-drizzle/src/mariadb/__tests__/drizzle-mariadb-repository.docker-spec.ts:8
packages/nestjs-repository-drizzle/src/mysql/__tests__/drizzle-mysql-conformance.docker-spec.ts:11
packages/nestjs-repository-drizzle/src/mysql/__tests__/drizzle-mysql-repository.docker-spec.ts:8
packages/nestjs-repository-drizzle/src/postgres/__fixtures__/postgres-databases.fixture.ts:20
packages/nestjs-repository-drizzle/src/postgres/__tests__/drizzle-postgres-transaction-settings.docker-spec.ts:28
packages/nestjs-samples/src/04-email/notification/notification.controller.ts:18 (sample sender address)
scripts/smoke-test.mjs:57 (temp dir prefix rockets-smoke-)
```

**g. Outside the tree**
- The working directory `~/NetBeansProjects/rockts/rockets`. The git remote is already
  `btwld/nestjs-modules`.
- The sibling repo `~/NetBeansProjects/anago-rockets-fit` and its report file names (8.2).

## 9. Session 2 (branch `feature/v8-decisions-slice`, from `0edf7508`)

- **Stale metadata.** The `pnpm-workspace.yaml` comment says 15 v8 packages (was 14).
  `typedoc.json` lists `nestjs-repository-drizzle` and `nestjs-file`, so its `name` (section 8.4c)
  moved from line 18 to line 19. The root `package.json` version is `8.0.0-alpha.15` (was
  `7.0.0-alpha.10`), matching the packages.
- **`forRoot({ drivers })` became `forRoot({ adapters })`**, on `forRoot` and `forRootAsync`, in
  the specs, fixtures, examples, TSDoc and READMEs. Nothing else was renamed: each entry's
  `driver:` key, the `RepositoryDriver*` types and the "driver" prose stay. `RepositoryAdapter`
  keeps its name. There is no alias (alpha).
- **The export `./conformance` became `./conformance/adapter`.** Its source moved from
  `src/conformance.ts` to `src/conformance-adapter.ts` (`git mv`), following the subpath-to-file
  convention of `optional/*`.
- **CLAUDE.md** (local): rules 3 and 6 say "adapter" and name the new export path. A
  vocabulary line follows rule 6: an adapter is an implementation, a driver only the low-level
  database client, and `RepositoryAdapter` is the one exception.
- **This log** moved here with `mv -n`. Its pointers were updated in the handoff and in the
  memory `feedback-retired-framework-name.md`.

## 10. Session 2b: finishing the rename

The user weighed going back to "driver" and chose "adapter" for everything, keeping "driver" only
for a database client (pg, mysql2, better-sqlite3, oracledb, mssql) or an ORM's own driver layer.

- **`e1a28e5a` `refactor!`** (BREAKING CHANGE footer with migration steps):
  - Each registration entry's `driver` key became `adapter`.
  - `RepositoryDriverInterface`, `RepositoryDriverRegistration(s)`, `RepositoryDriverEntityOptions`
    and `RepositoryDriverOptions` became `RepositoryAdapter…`.
  - The conformance harness `driver` and `driverOptions` became `adapter` and `adapterOptions`.
  - Internal names followed (`assertDistinctAdapters`, `adapterModules`, `adapterName`, type
    parameters, fixture classes).
  - The README heading "Testing Your Driver" became "Testing Your Adapter", and its one link was
    updated. A check of every relative link and anchor in the tracked READMEs found none broken.
  - `TypeOrm{Postgres,Oracle,SqlServer}DriverOptionsInterface` and
    `DrizzlePostgresDriverOptionsInterface` became `…AdapterOptionsInterface` (files moved to
    `*-adapter-options.interface.ts`). Each holds only adapter-level settings
    (`transactionSettings`, `applicationContext`, `sessionContext`), none of the database
    client's, so none keeps "Driver".
- **`903cc76c` `docs:`**: prose, TSDoc, test titles and boot/warning messages say "adapter". The
  specs asserting the messages are updated.
- **Separate decisions, still "driver":**
  - Durable messaging: `DurableDriverInterface`, `UnsupportedDurableDriverException` (and its
    `DURABLE_DRIVER_UNSUPPORTED` code), `DurableMessagingModule.forRoot({ driver })`, the
    `DurableDriverFixture`s and the durable prose in the repository, TypeORM and Drizzle READMEs.
  - `packages/nestjs-repository/src/repository/repository-adapter.ts`, left untouched with the
    class: its private `toDriverQuery`, about 40 TSDoc mentions, and three messages ("The driver
    returned …") that `result-check.spec.ts` asserts.
- **CLAUDE.md** (local): the repository rules' intro says "adapters report and translate"; rule 3
  says "Adapters never decide" (already, from session 2); the docker-tests line says "the TypeORM
  adapters"; the vocabulary line names `forRoot({ adapters: [{ adapter, entities }] })` and
  `RepositoryAdapterInterface`. Rules 1, 2 and 4 still say "the driver" where they mean the
  adapter. They weren't in the requested set.
- **The handoff** marks sessions 1, 2 and 2b done.
