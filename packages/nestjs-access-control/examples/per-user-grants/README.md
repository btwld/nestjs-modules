# Per-User Grants From Storage

Each role has a template of rules, and an admin adds rules for one user on
top, through an admin API. The next request uses the change.

| Role | Template |
| --- | --- |
| `analyst` | `read:any` on reports, `payroll` denied |
| `admin` | `read:any` on reports; `read:any` and `update:any` on `user-rules` |

## What to look at

- **A grants provider.** The module asks it for the actor's rules on every
  check: their roles' templates plus their own rules, from
  [`permission.store.ts`](./permission.store.ts). The wiring is in
  [`per-user-grants.module.ts`](./per-user-grants.module.ts).
- **Granting one user more.** An admin gives one analyst `export:any` on
  reports; that analyst can export, and the others still can't.
- **A deny in the template always wins.** Granting an analyst `payroll`
  changes nothing: the template denies it.
- **Checking rules before saving.** The store runs `accessRuleProblems` and
  refuses rules that could not be used, listing every problem, so a bad
  edit never reaches a check.
- **Whoever edits rules can't raise access around them.** Holding
  `update:any` on `user-rules` would otherwise be total power, so the store
  refuses an admin editing their own rules, and refuses per-user rules on
  `user-rules`: that power comes only from a role. The handler finds the
  editor with `AccessControlService.decision`.
- **"My permissions".** `GET /me/permissions` returns
  `AccessControlService.effectiveRules`, for a UI to grey out what the
  caller can't do. CASL's frontend packages read it as is.

## Run it

```sh
pnpm test:e2e packages/nestjs-access-control/examples/per-user-grants
```
