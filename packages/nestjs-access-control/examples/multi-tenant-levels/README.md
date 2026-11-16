# Multi-Tenant Access Levels

Each user belongs to some tenants, with a role in each. Roles are described
the way an admin screen shows them, as a level per resource, and the levels
become rules.

| Level | Verbs | Own records only |
| --- | --- | --- |
| `none` | none | |
| `view-own` | `read` | `read` |
| `view` | `read` | |
| `edit-own` | `read`, `create`, `update` | `create`, `update` |
| `edit` | `read`, `create`, `update` | |
| `full` | `read`, `create`, `update`, `delete` | |

| Role | Projects | Budget |
| --- | --- | --- |
| `manager` | `full` | `view` |
| `member` | `edit-own` | `none` |
| `guest` | `view` | `none` |
| `contractor` | `view-own` | `none` |

Alice is a manager in Acme and a guest in Globex; Bob is a member and Cara a
contractor in Acme only.

## What to look at

- **Levels to rules.** [`level-rules.util.ts`](./level-rules.util.ts) turns
  a role's levels into grants of verbs; the module checks them at startup
  like any others. Which verbs a level holds only on the caller's own
  records stays in the same file, as the application's own data.
- **Roles per tenant.** The actor resolver in
  [`multi-tenant-levels.module.ts`](./multi-tenant-levels.module.ts) reads
  the tenant from the route and gives the caller the role they hold there,
  or none. The same person is a manager on `/tenants/acme/...` and a guest
  on `/tenants/globex/...`.
- **Own-only levels are a record check.** Rename and delete use
  [`own-project.query.ts`](./own-project.query.ts). Once a grant lets the
  call in, it limits a caller to the projects they own when their level in
  that tenant is own-only for the route's verb. A person is limited unless
  one of their roles is not. The list returns a `view-own` caller only
  their own projects, and create makes the caller the owner.
- **Keeping tenants apart is not access control's job.** Grants say what a
  caller may do to projects, not which tenant's projects they reach. The
  store takes the tenant on every call here; in an application on
  `@concepta/nestjs-repository`, row scope enforces it on every read and
  write.

## Run it

```sh
pnpm test:e2e packages/nestjs-access-control/examples/multi-tenant-levels
```
