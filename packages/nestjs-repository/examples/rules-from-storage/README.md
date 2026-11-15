# Rules From Storage

A documents API whose rules live in a table an admin edits at runtime. Nobody
may read documents until the admin adds a rule saying so.

[`stored-rules.ts`](./stored-rules.ts) answers `CaslAuthority` from the
`stored_rule` table. The table is governed too: only an `admin` may edit it, by
rules fixed in code, since the rules that protect the table cannot live in
it. The table is read as the `authority` system, on a `ctx` of its own, so a
caller who may not read the rules is still decided by them.

## What to look at

- **A change applies to the next request.** The admin adds a rule with
  `POST /rules`; the clerk's next `GET /documents` is allowed. Deleting the
  rule takes it away again. Within one request every check reads the same
  rules, because `CaslAuthority` asks for them once per `ctx`.
- **A rule is checked before it is saved.** `POST /rules` runs
  `authorityRuleProblems` on the rule and answers `400` with the problems,
  so a rule `CaslAuthority` cannot use, such as one with `action: 'manage'`,
  never reaches the table.
- **Some columns only.** A rule with `fields: ['id', 'title']` lets an intern
  list documents without their body.
- **A deny waiting on a decision.** A deny with a `reason` refuses as any
  deny does. The response never names the reason; the refusal your logs see
  carries it as `context.gate`.

## Run it

```sh
pnpm test:e2e packages/nestjs-repository/examples/rules-from-storage
```
