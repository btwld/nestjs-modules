# System Integrations

Partner systems call the API with an API key, and staff call the same
routes signed in. A payment provider marks invoices paid; a CRM reads
customers, never their card.

| Actor | Rules |
| --- | --- |
| `system:billing` | `update` on invoices, only `status` and `paidAt` |
| `system:crm` | `read` on customers, `cardNumber` denied |
| `role:support` | `read` on customers |

## What to look at

- **Defining the system as the actor.** [`api-key.guard.ts`](./api-key.guard.ts)
  maps the key to a system and defines `{ kind: 'system', name }` as
  `ActorCtx`, immutably. It is a global guard, so it runs before the access
  check, and the check sees the system. With
  `@concepta/nestjs-authentication`'s global JWT guard, a caller sending
  only a key is refused (`401`) by that guard, whatever order the two run
  in: mark the routes it
  serves `@AuthPublic({ optional: true })`, or turn the global guard off
  (`appGuard: false`).
- **Writing is not reading.** The payment provider may mark invoices paid
  but read none, so its update's response is empty: responses show what
  the caller may read, whatever the route does. (A generated CRUD update
  on an entity an authority governs reads the row as the caller first, so
  there it would also need `read`.)
- **Systems are not roles.** A person whose role is named `billing` gets
  none of `system:billing`'s grants.
- **An unknown key is nobody.** The guard defines no actor, the actor
  resolver finds no signed-in user, and the call is refused with
  `no-actor`.
- **Outside HTTP.** [`payment-event.consumer.ts`](./payment-event.consumer.ts)
  handles payment events from a queue: it opens a context per message,
  defines the billing system as the actor, and checks with
  `AccessControlService.assert`.

## Run it

```sh
pnpm test:e2e packages/nestjs-access-control/examples/system-integrations
```
