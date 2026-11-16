# Ownership

Members read and edit their own documents but cannot give one away;
managers read everyone's; admins edit everyone's, owner included.

| Role | Rules | On everyone's documents |
| --- | --- | --- |
| `member` | `read`, `update` on documents; `ownerId` denied on `update` | none |
| `manager` | `read` on documents | `read` |
| `admin` | `read`, `update` on documents | `read`, `update` |

## What to look at

- **Grants give verbs; ownership is a record check.** On whose documents a
  role holds each verb is the application's own data,
  `EVERYONES_DOCUMENTS` in
  [`own-documents-only.util.ts`](./own-documents-only.util.ts). Each verb
  is decided on its own: a person is limited to their own documents for an
  action unless one of their roles holds it on everyone's, so a member who
  also manages reads anyone's document but edits only her own. A role not
  listed is limited.
- **The access query service checks the record.** Once a grant lets the
  call in, [`own-document.query.ts`](./own-document.query.ts) lets a
  limited caller reach only the document they own, and lets everyone else
  through.
- **A missing document is refused like someone else's** for a limited
  caller, so the answer doesn't tell them which ids exist. Anyone else gets
  a `404`.
- **Field denies.** The update handler passes the body's fields to
  `AccessControlService.assertFields`, which checks them against the
  caller's rules for `update`: a member is refused `ownerId`, an admin may
  change it.
- **The query service uses your providers.** It injects the document store,
  so it is registered in the application's module rather than in
  `queryServices`: the route guard finds it in any module.
- **Lists.** The list handler returns everything to a caller who is not
  limited, and their own documents otherwise.

## With `@concepta/nestjs-repository`

On repository data, ownership is
[row scope](../../../nestjs-repository/README.md#row-scope): your resolver
scopes a limited caller to their own rows (`ownerId` from the `RowScopeCtx`
overlay you set from the signed-in user), and every read and
write through the repository is narrowed to their rows, lists included. No
access query service or handler filtering is needed.

## Run it

```sh
pnpm test:e2e packages/nestjs-access-control/examples/ownership
```
