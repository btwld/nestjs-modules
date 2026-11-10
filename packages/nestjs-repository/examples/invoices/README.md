# Invoices

Invoices written with their lines, joined with their customer, in tenants:

| Role | May |
| --- | --- |
| `clerk` | create, read and update invoices and lines; read customers, without their `creditLimit` |
| `intake` | create invoices and lines, and read nothing |
| `junior` | create invoices, but not lines |
| `collector` | read invoices and customers, credit limits included |

The rules and the tenant row scope are in [`invoice.rules.ts`](./invoice.rules.ts);
[`invoices.module.ts`](./invoices.module.ts) registers invoices to cascade
to their lines.

## What to look at

- **Authority and row scope together.** Row scope decides which tenant's
  rows a caller reaches and stamps the tenant on what they create; authority
  decides what they may do. A clerk in another tenant sees none of these
  invoices, whatever their role allows.
- **A cascade decided first.** The repository opens no transaction, so a
  cascade's related rows are decided before the invoice is written. A junior
  creating an invoice with lines is refused, and nothing is stored.
- **A joined row without a column.** `?include=customer` joins each
  invoice's customer. The clerk's customers hold no `creditLimit`; the
  collector's do.
- **Creating without reading.** Intake may create but not read. The response
  holds only the keys of what it created, enough to refer to it.

## Run it

```sh
pnpm test:e2e packages/nestjs-repository/examples/invoices
```
