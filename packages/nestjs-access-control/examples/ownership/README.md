# Ownership

Members read and edit their own documents but cannot give one away;
managers read everyone's; admins edit everyone's, owner included.

| Role | Rules |
| --- | --- |
| `member` | `read:own`, `update:own` on documents; `ownerId` denied on `update:own` |
| `manager` | `read:any` on documents |
| `admin` | `read:any`, `update:any` on documents |

## What to look at

- **`own` needs a check.** A grant on `own` lets the call through to the
  route's access query service, which decides whether the document is the
  caller's: [`own-document.query.ts`](./own-document.query.ts). A caller
  who got through on `any` needs no check. On a route with neither a query
  service nor `@AccessControlOwnInHandler`, an `own` grant is refused
  (`own-unchecked`); the list route declares it, and narrows the rows
  itself.
- **A missing document is refused like someone else's** for a caller on
  `own`, so the answer doesn't tell them which ids exist. A caller on
  `any` gets a `404`.
- **Fields follow the grant the caller got in on.** The update handler
  passes the body's fields to `AccessControlService.assertFields`, which
  checks them under that grant: a member on `update:own` is refused
  `ownerId`, an admin on `update:any` may change it.
- **The query service uses your providers.** It injects the document store,
  so it is registered in the application's module rather than in
  `queryServices`: the route guard finds it in any module.
- **Lists.** The list route returns everything to a caller who may read any
  document, and their own documents otherwise. In an application on
  `@concepta/nestjs-repository`, row scope narrows the rows instead.

## Run it

```sh
pnpm test:e2e packages/nestjs-access-control/examples/ownership
```
