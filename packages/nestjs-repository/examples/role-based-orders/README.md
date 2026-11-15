# Role-Based Orders

An orders API used by two roles and one system:

| Actor | May |
| --- | --- |
| `clerk` | create, read and update orders, but never see their `cost` or change their `total` |
| `manager` | read, update and delete orders |
| `billing-sync` (a system) | read orders, and update only their `total` and `status` |

The rules are in [`order.rules.ts`](./order.rules.ts), wired into a
`CaslAuthority` in [`role-based-orders.module.ts`](./role-based-orders.module.ts).
The controller, [`order.controller.ts`](./order.controller.ts), checks
nothing: it passes the request's `ctx` to the repository, which decides every
call.

## What to look at

- **Hiding a column.** The clerk's rules deny reading `cost`. Their lists,
  reads, and the responses to their own writes leave it out, and sorting by
  it is refused, since the order would give it away.
- **Refusing a column on write.** The clerk may update an order, but a body
  touching `total` is a `403`; a body touching only `customer` goes through.
- **A system acting as itself.** [`billing-sync.job.ts`](./billing-sync.job.ts)
  runs outside any request. It defines `ActorCtx` as the `billing-sync`
  system, so it is decided by that system's rules alone.
- **Nobody acting.** A request without `X-Roles` carries no actor and is
  refused, a `403` with refusal `no-actor`.

## Run it

```sh
pnpm test:e2e packages/nestjs-repository/examples/role-based-orders
```
