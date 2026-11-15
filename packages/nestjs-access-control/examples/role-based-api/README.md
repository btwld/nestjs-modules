# Role-Based API

An invoices API used by three roles:

| Role | May |
| --- | --- |
| `admin` | create, read, update and delete invoices |
| `accountant` | create, read and update invoices, but not change an `amount` |
| `viewer` | read invoices, without their `internalNotes` |

The rules are in [`invoice.grants.ts`](./invoice.grants.ts). Each route
declares the grant it needs in
[`invoice.controller.ts`](./invoice.controller.ts), and the module wires the
grants and an actor resolver in
[`role-based-api.module.ts`](./role-based-api.module.ts).

## What to look at

- **Hiding a field.** The viewer's rules allow `read` on invoices and
  deny `internalNotes`. Their responses leave the field out; nothing in the
  handler knows.
- **Refusing a field on write.** The route guard checks the resource only.
  The create and update handlers pass the fields the body touches to
  `AccessControlService.assertFields`, which checks them against the
  caller's rules for the route's action: it refuses the accountant's change to
  `amount` and lets their change to the notes through.
- **Nobody acting, or no grant.** The demo guard lets a caller who is not
  signed in through, so the call reaches the check with nobody acting and
  gets a `403` with refusal `no-actor` (with
  `@concepta/nestjs-authentication`, an unauthenticated call is answered
  `401` first). A signed-in user with no role gets a `403` with refusal
  `no-grant`.

## Run it

```sh
pnpm test:e2e packages/nestjs-access-control/examples/role-based-api
```

[`role-based-api.e2e-spec.ts`](./role-based-api.e2e-spec.ts) signs in as
each user and shows what they get.
