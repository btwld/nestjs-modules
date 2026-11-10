# Multi-Tenant Access Levels

Each user belongs to some tenants, with a role in each. Roles are described
the way an admin screen shows them, as a level per object, and the levels
become rules.

| Level | Rules |
| --- | --- |
| `none` | none |
| `view-own` | `read:own` |
| `view` | `read:any` |
| `edit-own` | `read:any`, `create:own`, `update:own` |
| `edit` | `read:any`, `create:any`, `update:any` |
| `full` | `read:any`, `create:any`, `update:any`, `delete:any` |

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
  a role's levels into grants; the module checks them at startup like any
  others.
- **Roles per tenant.** The actor resolver in
  [`multi-tenant-levels.module.ts`](./multi-tenant-levels.module.ts) reads
  the tenant from the route and gives the caller the role they hold there,
  or none. The same person is a manager on `/tenants/acme/...` and a guest
  on `/tenants/globex/...`.
- **`own` levels need a check.** An `own` grant counts only on a route that
  checks ownership. Renaming checks the owner with
  [`own-project.query.ts`](./own-project.query.ts); the list and create
  routes declare `@AccessControlOwnInHandler`: the list returns a
  `view-own` caller only their own projects, and create makes the caller
  the owner.
- **Keeping tenants apart is not access control's job.** Grants say what a
  caller may do to projects, not which tenant's projects they reach. The
  store takes the tenant on every call here; in an application on
  `@concepta/nestjs-repository`, row scope enforces it on every read and
  write.

## Run it

```sh
pnpm test:e2e packages/nestjs-access-control/examples/multi-tenant-levels
```
