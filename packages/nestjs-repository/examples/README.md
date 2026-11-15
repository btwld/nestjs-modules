# Repository Examples

Small, complete NestJS applications, one per common situation. Each folder
holds the app module, its controllers, and an end-to-end spec that boots the
app and makes real HTTP requests against it, so every example runs and stays
correct.

| Example | Shows |
| --- | --- |
| [Role-based orders](./role-based-orders) | Object authority from CASL rules: a column hidden from one role, a column one role may not write, a job acting as a system |
| [Rules from storage](./rules-from-storage) | Rules an admin edits at runtime, a rule allowing some columns only, a deny waiting on a decision |
| [Invoices](./invoices) | Authority with row scope, a cascade decided before anything is written, a joined customer without a column, a role that may create but not read |

## Running them

From the repository root:

```sh
pnpm test:e2e packages/nestjs-repository/examples
```

or one example:

```sh
pnpm test:e2e packages/nestjs-repository/examples/invoices
```

The specs are the place to start reading: each test is one request, named
for what it shows.

## What is stood in for

- **Authentication** is `DemoActorGuard` in [`shared`](./shared): the
  request header `X-Roles: clerk` signs in a person with that role, and
  `X-Tenant: acme` puts them in a tenant. In your application,
  authentication signs the user in (`AuthUserCtx`). With access control,
  the `actorResolver` you give it defines `ActorCtx` from the verified
  user; without one, you define it once per call, immutably, as this guard
  does;
  `frozenActor` freezes its roles for you.
- **The driver** is `@concepta/nestjs-repository-typeorm` over an in-memory
  SQLite database. Any driver works the same: authority is enforced by the
  repository, never by the driver.
- **Request validation** is left out; validate bodies as you normally would.

The examples import `@concepta/nestjs-repository` exactly as your
application does. In this repository, that name is the workspace package,
built before the examples run.
