# Access Control Examples

Small, complete NestJS applications, one per common situation. Each folder
holds the app module, its controllers, and an end-to-end spec that boots the
app and makes real HTTP requests against it, so every example runs and
stays correct.

| Example | Shows |
| --- | --- |
| [Role-based API](./role-based-api) | Grants per role, a field hidden from one role, a field one role may not write |
| [Ownership](./ownership) | `own` grants, an access query service that checks the owner, lists of your own records |
| [Per-user grants from storage](./per-user-grants) | Role templates plus per-user rules an admin edits at runtime, a "my permissions" endpoint |
| [System integrations](./system-integrations) | Partner systems calling with API keys, a queue consumer acting as a system |
| [Multi-tenant access levels](./multi-tenant-levels) | Roles described as access levels, a different role in each tenant |
| [Shared rules](./shared-rules) | One rule set deciding both routes and repository data, narrowed for one API |
| [CRUD routes](./crud-routes) | Generated CRUD routes with field denies on query input and write bodies |

## Running them

From the repository root:

```sh
pnpm test:e2e packages/nestjs-access-control/examples
```

or one example:

```sh
pnpm test:e2e packages/nestjs-access-control/examples/ownership
```

The specs are the place to start reading: each test is one request, named
for what it shows.

## What is stood in for

The examples keep everything outside access control as small as possible:

- **Authentication** is `DemoAuthGuard` in [`shared`](./shared): the request
  header `Authorization: Bearer <user id>` signs that user in. Your
  authentication puts the verified user on the request instead; the actor
  resolvers read it the same way.
- **Storage** is in memory, except in Shared rules and CRUD routes, which run
  `@concepta/nestjs-repository` over an in-memory SQLite database. In an
  application on the repository, which rows a caller reaches (their own,
  their tenant's) is row scope's job, so handlers don't filter rows
  themselves.
- **Request validation** is left out; validate bodies as you normally would.

The examples import `@concepta/nestjs-access-control` exactly as your
application does. In this repository, that name points at the package
source.
