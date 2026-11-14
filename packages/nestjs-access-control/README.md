# @concepta/nestjs-access-control

Decide who may do what to which resource, by role and by external system.
You write rules, say who is acting, and mark the routes that need a grant;
the module refuses everything else, filters responses down to the fields the
caller may see, and answers the same question inside your command handlers.
Rules are plain JSON, decided by [CASL](https://casl.js.org), so they can
live in your code or in your database, and they are written the same way as
the rules of `@concepta/nestjs-repository`'s authority.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-access-control)](https://www.npmjs.com/package/@concepta/nestjs-access-control)
[![NPM Downloads](https://img.shields.io/npm/dw/@concepta/nestjs-access-control)](https://www.npmjs.com/package/@concepta/nestjs-access-control)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/peer/@nestjs/common/feature/version-8?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-access-control%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Examples](#examples)
- [Writing Rules](#writing-rules)
- [How Rules Combine](#how-rules-combine)
- [Sharing Rules with the Repository](#sharing-rules-with-the-repository)
- [Who Is Acting](#who-is-acting)
- [Rules at Runtime](#rules-at-runtime)
- [Protecting Routes](#protecting-routes)
- [Response Filtering](#response-filtering)
- [Record Checks](#record-checks)
- [Checking in Handlers](#checking-in-handlers)
- [CRUD Routes](#crud-routes)
- [Showing Permissions in a UI](#showing-permissions-in-a-ui)
- [Options](#options)
- [Exceptions](#exceptions)

## Installation

```sh
yarn add @concepta/nestjs-access-control \
  @nestjs/common @nestjs/config @nestjs/core
```

This package is ESM-only and requires Node.js >= 22.12 and NestJS 12. It
brings `@concepta/nestjs-core`, `@casl/ability` and `rxjs` with it.

## Quick Start

Give each role its rules, keyed `role:<name>`:

```ts
import { AccessControlModule } from '@concepta/nestjs-access-control';

@Module({
  imports: [
    AccessControlModule.forRoot({
      settings: {
        grants: {
          'role:admin': [{ action: ['read', 'update'], subject: 'user' }],
          'role:member': [
            { action: 'read', subject: 'user', fields: ['id', 'name'] },
          ],
        },
      },
    }),
  ],
})
export class AppModule {}
```

Tell it who is acting with an `actorResolver` that reads the authenticated
user (see [Who Is Acting](#who-is-acting)), then mark the routes:

```ts
import { AccessControlReadOne } from '@concepta/nestjs-access-control';

@Controller('users')
export class UserController {
  @Get(':id')
  @AccessControlReadOne('user')
  getOne(@Param('id') id: string) {
    // ...
  }
}
```

An admin reads any user. A member reads them too, but the response holds
only `id` and `name`. Anyone else, or a call with nobody acting, gets a
`403`.

## Examples

Complete, runnable applications, each with a spec that makes real requests
against it:

- [Role-based API](./examples/role-based-api): grants per role, hiding a
  field from one role, refusing a field on write.
- [Ownership](./examples/ownership): members limited to their own
  records, checked by an access query service.
- [Per-user grants from storage](./examples/per-user-grants): role
  templates plus per-user rules an admin edits at runtime, and a "my
  permissions" endpoint.
- [System integrations](./examples/system-integrations): partner systems
  calling with API keys, and a queue consumer acting as a system.
- [Multi-tenant access levels](./examples/multi-tenant-levels): roles
  described as access levels, with a different role in each tenant.
- [Shared rules](./examples/shared-rules): one rule set deciding both the
  routes and the repository's data, narrowed for one API.
- [CRUD routes](./examples/crud-routes): generated CRUD routes, with field
  denies holding on query input and write bodies.

See [the examples' README](./examples) for how to run them.

## Writing Rules

A rule names an action, a resource, and optionally the fields it covers:

```ts
{ action: 'update', subject: 'invoice', fields: ['notes', 'dueDate'] }
```

- **`action`** is a verb: `create`, `read`, `update`, `delete`,
  `softDelete`, `restore`, or one of your own, such as `approve`.
- **`subject`** is the resource, matching what your routes declare.
- **`fields`** limits the rule to those field paths. A path covers
  everything beneath it (`address` covers `address.city`), and positions in
  arrays are ignored (`items.amount` covers every item). Leave it out to
  cover every field.
- **`inverted: true`** makes the rule a deny. Its `reason` is reported as a
  decision still pending (`gate`) when it refuses a call.

Rules are `AuthorityRuleInterface` from `@concepta/nestjs-core`, the shape
`@concepta/nestjs-repository`'s authority reads too. `settings.grants`
accepts any verb, since your routes may declare their own, so a typo there
grants nothing rather than failing to compile. Type your rules as
`AuthorityRuleInterface`, which accepts only the verbs above, and a typo
fails to compile; widen it for verbs of your own,
`AuthorityRuleInterface<'read' | 'approve'>`. Actions and subjects can be
lists. A rule set is refused, at startup or when it is loaded, if any rule:

- has an action that is not a verb, such as `read all`;
- uses `manage` or `all`, which CASL treats as "everything";
- has `conditions`. Which records a caller reaches is row scope's job (see
  `@concepta/nestjs-repository`), not a grant's;
- has an empty `fields` list, or a blank entry in it;
- names a pattern in `fields` (`profile.*`): name the parent (`profile`),
  which covers everything beneath it;
- names an array position or numeric key in `fields` (`items.0.amount`):
  name the field beneath it (`items.amount`) instead;
- has a property other than `action`, `subject`, `fields`, `inverted` and
  `reason`.

`authorityRuleProblems(rules, source)` from `@concepta/nestjs-core` lists
every problem with a rule set, so a screen that edits rules can check them
before saving.

To hide a field, allow the resource and deny the field:

```ts
'role:support': [
  { action: 'read', subject: 'user' },
  { action: 'read', subject: 'user', fields: ['password'], inverted: true },
],
```

A denied field is also protected from writes to its parents: with
`profile.ssn` denied on `update`, a write to `profile` as a whole, such as
`{ profile: null }`, is refused too.

## How Rules Combine

A caller's rules are the rules of every role they hold, plus any rules a
[grants provider](#rules-at-runtime) adds for them alone. Then:

- **nothing is allowed without a rule allowing it;**
- **a deny always wins**, whichever role or source it came from and wherever
  it sits in the list;
- **fields combine the same way**: a field denied by one of the caller's
  roles is hidden even if another role allows it.

| Caller's rules | Result |
| --- | --- |
| none | refused |
| an allow | allowed |
| an allow and a deny, from any roles | refused |
| allow `user`, deny `user.password` | allowed, without `password` |

## Sharing Rules with the Repository

When the data behind your routes lives in
[`@concepta/nestjs-repository`](../nestjs-repository/README.md#object-authority)
with an authority, hand access control the same authority, and you write
your data rules once:

```ts
AccessControlModule.forRootAsync({
  imports: [AuthorityModule],
  inject: [CaslAuthority],
  useFactory: (authority: CaslAuthority) => ({
    authority: { authority, except: ['reports'] },
    actorResolver,
  }),
});
```

- **The authority decides each route first.** A route's resource is read
  as the authority's subject and its action as the verb, so
  `@AccessControlDeleteOne('invoices')` asks whether the actor may `delete`
  `invoices`. A refusal is a `403` with refusal `authority`, before the
  handler runs. Name a route's resource as the entity is keyed in
  `RepositoryModule.forRoot()`: a misspelled one is refused by the
  authority, so the mistake shows. Which rows the caller reaches is row
  scope's job; the repository then decides each read and write by the same
  rules, columns included.
- **`except` names the routes that are yours alone.** A route on a resource
  no entity stands behind, such as `@AccessControlGrant({ resource:
  'reports', action: 'export' })`, is decided by your rules as if there
  were no authority, once its resource is in `except`: nothing is allowed
  without a rule allowing it. Until then, the authority refuses it.
- **Elsewhere, your own rules only narrow, by denying.**
  `settings.grants` and a grants provider still apply, but can never allow
  what the authority refuses:
  their denies count, their allows don't. Deny a field to hide it from one
  API's responses, or to refuse it in `assertFields`.
- `can` and `assert` in handlers decide the same way.

The two rule sets are written the same way but name different things. The
authority's rules name your storage: an entity and its columns, exactly as
stored. Access control's rules name your API: a route's resource and the
fields of its request and response bodies, which a mapper may rename or
nest (`total_cents` stored, `pricing.total` sent). So:

- **data rules go in the authority**, once: who may read or write which
  entity and which columns. They hold for every caller of the repository,
  routes or not;
- **access control's field rules are for the API alone**: a computed field,
  a response that is not an entity, a nested shape the storage doesn't have.
  One exception: on generated CRUD routes, query fields (`filter`, `sort`,
  `s`) reach the repository unchanged, so they are stored names (see
  [CRUD Routes](#crud-routes)).

Without an authority, your rules decide alone, as everywhere else in this
README. See the [Shared rules](./examples/shared-rules) example.

## Who Is Acting

The actor is a person acting through their roles, or an external system
acting on its own authority:

```ts
{ kind: 'role', roles: ['admin'], userId: 'u-42' }
{ kind: 'system', name: 'billing' }
```

For HTTP, pass an `actorResolver` that reads the authenticated user from the
request. Returning `undefined` means nobody is acting:

```ts
AccessControlModule.forRootAsync({
  imports: [UserRolesModule],
  inject: [UserRolesService],
  useFactory: (userRoles: UserRolesService) => ({
    settings: { grants },
    actorResolver: {
      actorFor: async (_ctx, context) => {
        const user = context?.switchToHttp().getRequest().user;

        return user
          ? {
              kind: 'role',
              roles: await userRoles.namesFor(user.id),
              userId: user.id,
            }
          : undefined;
      },
    },
  }),
});
```

Checked routes are checked by a route guard, which runs after every global
guard, so a global authentication guard has already put the user on the
request. With `@concepta/nestjs-authentication`, the resolver can read
`AuthUserCtx` from the call's context instead of `request.user`: the guard
that authenticated the call defined it. On a call nobody authenticated it
is absent when the resolver runs, so check before reading it:

```ts
actorFor: async (ctx) => {
  const host = AppContextHost.from(ctx);
  const user = host.supports(AuthUserCtx)
    ? host.with(AuthUserCtx).user
    : undefined;
  // ...
},
```

Authentication must run before the check, or the resolver finds nobody and
every caller is refused with `no-actor`, signed in or not:

- keep the authentication guard global (the default), or on the
  controller;
- on a method, list it *below* the access decorator: the lower decorator's
  guard runs first.

```ts
@Get()
@AccessControlReadMany('invoice')
@UseGuards(JwtGuard)
list() {
  // ...
}
```

A route marked `@AuthPublic()` never authenticates, so a grant on it
refuses everyone. For a public route that still recognises signed-in
callers, use `@AuthPublic({ optional: true })`.

The resolver decides who may act at all. `@concepta/nestjs-authentication`
already refuses a user turned off (`active: false`) on every call; refuse
anyone else your application shuts out. On a refresh route, the user is
whoever holds the refresh token; keep grants off routes that do anything but
issue tokens.

With a resolver, the module then defines the actor on the call's context as
`ActorCtx` (from `@concepta/nestjs-core`), on every HTTP call, so a route
handler, or anything it calls, checks with the same actor — repositories
governed by an
[authority](../nestjs-repository/README.md#object-authority) included. On a
route without a grant, the actor is defined by a global interceptor, so your
own guards and earlier interceptors don't see it yet there. The resolver
runs once per request; cache in it if it reads a database.
Don't define `ActorCtx` in an HTTP interceptor of your own: the guard has
already defined it by then, so redefining it fails.

The resolver is given a request only over HTTP: on other transports the
"request" is the message payload, which the sender controls. There, define
`ActorCtx` yourself. An integration consumer acting for another system
defines `{ kind: 'system', name: 'billing' }` on the context it opens for
each message:

```ts
import { ActorCtx, AppContextHost } from '@concepta/nestjs-core';

const ctx = new AppContextHost();
ctx.defineOverlay(
  ActorCtx,
  { kind: 'system', name: 'billing' },
  { immutable: true },
);
```

A call carrying `ActorCtx` uses it; the resolver is asked only when it is
absent. A system is checked against `system:billing` rules only, never
against the roles of whatever account it runs under:

```ts
grants: {
  'system:billing': [{ action: 'update', subject: 'invoice' }],
}
```

## Rules at Runtime

To keep rules in your database, so an admin screen can edit them, pass a
`grantsProvider`. It is asked for the actor's rules on every check, so an
edit applies to the next call:

```ts
AccessControlModule.forRootAsync({
  imports: [PermissionsModule],
  inject: [PermissionsService],
  useFactory: (permissions: PermissionsService) => ({
    grantsProvider: {
      rulesFor: async (ctx, actor) =>
        actor.kind === 'role'
          ? [
              ...(await permissions.forRoles(actor.roles)),
              ...(await permissions.forUser(actor.userId)),
            ]
          : permissions.forSystem(actor.name),
    },
  }),
});
```

Per-user rules sit on top of the role template: a user rule can allow what
the template leaves out, and deny what it allows, but cannot undo a deny in
the template. Every rule set the provider returns is checked before use; a
set that breaks the rules in [Writing Rules](#writing-rules) refuses the
call. Caching, and telling other instances about an edit, is up to the
provider. `rulesFor` returns the rules or a promise of them, as the
repository's `CaslAuthority` rules source does; the difference is when each
is asked: the CASL authority asks once per `ctx`, while the grants provider
is asked on every check.

## Protecting Routes

Each decorator declares the grant a route needs, and applies the check to
that route:

| Decorator | Action |
| --- | --- |
| `@AccessControlReadOne(resource)`, `@AccessControlReadMany(resource)` | `read` |
| `@AccessControlCreateOne(resource)`, `@AccessControlCreateMany(resource)` | `create` |
| `@AccessControlUpdateOne(resource)`, `@AccessControlReplaceOne(resource)` | `update` |
| `@AccessControlDeleteOne(resource)` | `delete` |
| `@AccessControlSoftDeleteOne(resource)` | `softDelete` |
| `@AccessControlRestoreOne(resource)` | `restore` |
| `@AccessControlGrant({ resource, action }, ...)` | yours |

```ts
@Post(':id/approve')
@AccessControlGrant({ resource: 'invoice', action: 'approve' })
approve(@Param('id') id: string) {
  // ...
}
```

With several grants, the first one the caller holds lets them through. On a
controller, a
decorator applies to every route in it, unless a route declares its own.
A route with neither is not checked. To catch one at startup, turn on core's
[route audit](../nestjs-core/README.md#route-audit): this module adds the
`requireAcl` rule, which fails startup for a route that has no grant and isn't
`@AuthPublic()`.

The check is a route guard: it runs after every global guard and before
every interceptor, so nothing, such as a cached response, can let a caller
through a checked route without it.

## Response Filtering

A checked route's response is filtered down to the fields the caller may
read, under their `read` rules, whatever the route does: an update's
response shows what a read of the same record would, not what the caller
may write, and a caller who may write but not read gets an empty response.

- each item of an array is filtered, and so is each item of a paginated
  response's `data`; the page's counters are kept, and its other fields
  filtered;
- objects are filtered as they go over the wire, after `toJSON`; an
  instance of your class stays an instance of it, so a class serializer
  (such as `ClassSerializerInterceptor`) still applies its own rules
  afterwards. Getters and methods the caller may not read are blanked on
  the filtered instance, so a serializer cannot send them, and later code
  cannot call them;
- a response with no fields, such as a string, cannot be filtered: it is
  sent only to a caller who may read the resource;
- filtering runs after the route's own interceptors, so a route-level
  response serializer sees the full response first.

Rule fields name the paths your handler returns: a class's property names,
not the names a serializer renames them to on the way out. With
`@Expose({ name: 'socialSecurity' }) ssn`, deny `ssn`.

A client that needs the id of what it created, but may not read the
record, can be granted just that field:

```ts
'system:billing': [
  { action: 'create', subject: 'invoice' },
  { action: 'read', subject: 'invoice', fields: ['id'] },
],
```

That also lets it through read routes on invoices, showing only `id`.

Pass `appFilter: false` to turn filtering off, or your own interceptor to
replace it.

### Caching responses

The filter is a global interceptor, so it filters only what passes through
it. A global interceptor that answers a call itself, such as a response
cache, and that runs before the filter, sends what it stored unfiltered:
the first caller's view of a record would reach every later caller. Global
interceptors run in the order they are registered, and the providers of
your root module are registered first.

A response cache must therefore either store unfiltered responses and run
after the filter, so each caller's copy is filtered on the way out, or keep
a separate entry per caller. Register a cache that runs after the filter
in a module imported after `AccessControlModule`, or on the route with
`@UseInterceptors`, never in the root module's `providers`. A module's
place is where it is first imported: a cache module also reached through a
module imported earlier runs before the filter. A cache with an entry per
caller must drop a caller's entries when their rules change, or a field
taken away stays visible until the entry expires.

## Record Checks

A grant says what a caller may do to a resource, not which of its records.
Which records a caller reaches, their own or their tenant's, is a question
about the data:

- **On data in `@concepta/nestjs-repository`, it is row scope's.** A row
  scope resolver limits every read and write, through any route or none: a
  clerk to `{ ownerId: actor.userId }`, a manager to their tenant. See
  [Row Scope](../nestjs-repository/README.md#row-scope).
- **On any other route, add an access query service.** It runs after a grant
  lets the call in, and decides from the call's context:

```ts
import {
  type AccessControlContextInterface,
  AccessControlQuery,
  type CanAccess,
} from '@concepta/nestjs-access-control';

@Injectable()
export class OwnProfileQuery implements CanAccess {
  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    const actor = context.getActor();
    const params = context.getRequest('params');

    return (
      actor.kind === 'role' &&
      typeof params === 'object' &&
      params !== null &&
      Reflect.get(params, 'id') === actor.userId
    );
  }
}

@Get(':id')
@AccessControlReadOne('profile')
@AccessControlQuery({ service: OwnProfileQuery })
getOne(@Param('id') id: string) {
  // ...
}
```

Register the service with the module's `queryServices`, or, when it injects
your own providers (such as the store that knows who owns a record), in
your own module: the check finds it in any module. A route with access
query services proceeds when one of them allows it, and is refused with
refusal `access-query` otherwise. On a controller, `@AccessControlQuery`
applies to every route, unless a route declares its own, which replace the
controller's. Access query services run only after a grant: on a route
without one, the call fails rather than skip them. Each one receives:

| Method | Returns |
| --- | --- |
| `getQuery()` | the grant the call got through on: actor, action, resource |
| `getActor()` | who is acting |
| `getContext()` | the call's context, as handlers receive it |
| `getAbility()` | the caller's CASL ability, for further checks |
| `getRequest(property?)` | the request, or one of its properties; `undefined` outside HTTP |

In a handler, `AccessControlService.decision(ctx)` returns the same grant:
who is acting and the action and resource the call was let through on, or
`undefined` on a call no route checked.

## Checking in Handlers

The route guard checks the resource, not the body. In a checked route's
handler, pass the fields a write touches to `assertFields`:

```ts
@Patch(':id')
@AccessControlUpdateOne('document')
async update(
  @Ctx() ctx: AppContextHost,
  @Param('id') id: string,
  @Body() changes: DocumentUpdatableDto,
) {
  await this.accessControl.assertFields(ctx, accessFieldPaths(changes));
  // ...
}
```

It checks each field under the grant the route let the caller in on. On a
route with several grants, that is the one that let them in, so write field
denies for each action the route grants. It reuses the route's decision, so
the rules are not resolved again. Called anywhere else, it throws
`AccessControlException`.

`accessFieldPaths` lists the fields a body sets, which is what a merging
update touches. A handler that replaces a nested object whole, such as a
JSON column, also touches the fields the body leaves out: pass the parent
too, `[...accessFieldPaths(changes), 'profile']`, so a denied
`profile.ssn` refuses the write.

Outside a checked route, in a command handler or in a message consumer
acting for a system, inject `AccessControlService` and name the action:

```ts
import {
  AccessControlService,
  accessFieldPaths,
} from '@concepta/nestjs-access-control';

@CommandHandler(UpdateInvoiceCommand)
export class UpdateInvoiceHandler {
  constructor(private readonly accessControl: AccessControlService) {}

  async execute({ ctx, id, changes }: UpdateInvoiceCommand) {
    await this.accessControl.assert(ctx, 'update', 'invoice', {
      fields: accessFieldPaths(changes),
    });
    // ...
  }
}
```

`assert` throws `AccessRefusedException` unless the actor may take the
action on the resource **and on every field in `fields`**. Without `fields`
only the resource is checked, so always pass the fields a write touches.
`can` answers the same question with a boolean.

## CRUD Routes

On routes generated by `@concepta/nestjs-crud`, declare each operation's
grant through `extraDecorators`, and register `AccessControlCrudPolicy` as
CRUD's request policy, so field denies hold there as on routes you write:

```ts
import { AccessControlCrudPolicy } from '@concepta/nestjs-access-control/optional/crud';

CrudModule.forRootAsync({
  inject: [AccessControlService],
  useFactory: (accessControl: AccessControlService) => ({
    requestPolicy: new AccessControlCrudPolicy(accessControl),
  }),
});
```

```ts
{
  operation: Operation.List,
  extraDecorators: [AccessControlReadMany('invoice')],
}
```

Give each operation the decorator for the action its repository call takes:
`AccessControlSoftDeleteOne` on `Operation.SoftDelete` and
`AccessControlRestoreOne` on `Operation.Restore`, so a role allowed to soft
delete but never to delete is let through the one route and not the other.

Before each request runs, under the grant its route let the caller in on:

- **Query input.** A `filter`, `or`, search or `sort` naming a field the
  caller may not read is refused, on every operation: matching or ordering
  by `salary` tells its value without showing it. Query fields reach the
  repository unchanged, so they are stored names: when your response
  schema sends `total_cents` as `total`, deny both. The deny on `total`
  hides it from responses; the one on `total_cents` stops filtering and
  sorting by it. A column refused in the repository's authority is refused
  in every query, routes or not.
- **Write bodies.** A create, an update and each item of a batch create may
  touch only fields the caller may write, as `assertFields` checks them.
- **Replace.** A replace erases what its body leaves out, so it is refused
  whenever a field is denied to the caller for the action.

What a request selects is not narrowed by these rules: the response filter
leaves out what the caller may not read. With a shared authority, the
repository also leaves the caller's hidden columns out of a list. Which rows a
generated route reaches is row scope's job, on the entity's repository. See the
[CRUD routes](./examples/crud-routes) example.

## Showing Permissions in a UI

`AccessControlService.effectiveRules` returns the actor's rules, denies
last, so a UI can grey out what they cannot do. It needs no grant of its
own:

```ts
@Get('me/permissions')
permissions(@Ctx() ctx: AppContextHost) {
  return this.accessControl.effectiveRules(ctx);
}
```

CASL's frontend packages read the result as is.

With an [authority](#sharing-rules-with-the-repository), these are only the
actor's own rules: what the authority allows is not among them. Show the
authority's rules instead, from wherever your application keeps them.

## Options

| Option | Default | Purpose |
| --- | --- | --- |
| `settings.grants` | `{}` | Rules keyed `role:<name>` or `system:<name>`. Checked at startup. |
| `actorResolver` | none | Works out who is acting when a call carries no `ActorCtx`. |
| `grantsProvider` | `settings.grants` | Supplies an actor's rules on every check. |
| `authority` | none | `{ authority, except? }`: decides each route first, except on resources in `except`; the actor's rules then only narrow. See [Sharing Rules with the Repository](#sharing-rules-with-the-repository). |
| `appFilter` | the response filter | Replace it, or `false` for none. |
| `queryServices` | `[]` | Access query services to register. |

`AccessControlModule` offers `forRoot` and `forRootAsync`, which make it
available everywhere, plus `register`, `registerAsync` and `forFeature`.
With `register`, register it once and import that module into every module
whose controllers use the decorators: their guard needs
`AccessControlService`. `forFeature` overrides options for one module and
needs `forRoot` or `forRootAsync` beside it; it adds no response filter or
actor overlay of its own.

## Exceptions

| Exception | Status | Fault | When |
| --- | --- | --- | --- |
| `AccessRefusedException` | 403 | `client` | A call is refused |
| `AccessRulesInvalidException` | 500 | `usage` | A rule set cannot be used |

`AccessRefusedException`'s message names only the action and the resource,
such as `Not allowed to delete invoices`. Its context names the `action`,
the `resource`, the `actor` (who they are only: their kind, and their roles
and user id or their name), and a `refusal`:

| Refusal | Meaning |
| --- | --- |
| `no-actor` | Nobody is acting |
| `no-grant` | No rule allows it |
| `denied` | A deny refuses it (also names a pending decision as `gate` when every deny that refused has a `reason`) |
| `field` | A field it touches is refused (also names the refused `fields`) |
| `access-query` | The route's access query service refused it |
| `authority` | The module's authority refuses it (also names any pending decision as `gate`) |

`AccessRulesInvalidException` lists every problem found, so one fix pass
covers them all.
