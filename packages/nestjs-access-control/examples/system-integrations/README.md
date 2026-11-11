# System Integrations

Partner systems call the API with an API key, and staff call the same
routes signed in. A payment provider marks invoices paid; a CRM reads
customers, never their card.

| Actor | Rules |
| --- | --- |
| `system:billing` | `update:any` on invoices, only `status` and `paidAt` |
| `system:crm` | `read:any` on customers, `cardNumber` denied |
| `role:support` | `read:any` on customers |

## What to look at

- **Defining the system as the actor.** [`api-key.guard.ts`](./api-key.guard.ts)
  is a global guard: it maps the key to a system and defines
  `{ kind: 'system', name }` as `ActorCtx`, immutably. Global guards run
  before the route guard access control adds, so the check sees the system.
- **Writing is not reading.** The payment provider may mark invoices paid
  but read none, so its update's response is empty: responses show what
  the caller may read, whatever the route does.
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
