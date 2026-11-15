# Shared Rules

An invoices API whose routes and data are decided by one set of rules:

| Role | May |
| --- | --- |
| `clerk` | create, read and update invoices, never seeing `internalNotes`; not change an `amount` through this API |
| `manager` | create, read, update and delete invoices |

The rules are in [`invoice.rules.ts`](./invoice.rules.ts), behind one
`CaslAuthority`. [`shared-rules.module.ts`](./shared-rules.module.ts) hands
it to both the repository (`authority` on the entity) and access control
(the `authority` option).

## What to look at

- **One rule set, two layers.** `INVOICE_RULES` says what each role may do
  with invoices and which columns. Access control decides each route by it
  before the handler runs: a clerk's `DELETE` is refused there, with refusal
  `authority`. The repository decides the data by it: a clerk's list leaves
  out `internalNotes`, though the controller asks for nothing special.
- **Narrowing for one API.** `ROUTE_GRANTS` are access control's own rules.
  They only narrow what the authority allows, by denying: clerks may update
  invoices, but this API refuses their change to `amount`
  (`assertFields` in the handler). They could never allow what the rules
  refuse.
- **Nobody acting.** A caller who is not signed in has no actor, and is
  refused.

## Run it

```sh
pnpm test:e2e packages/nestjs-access-control/examples/shared-rules
```
