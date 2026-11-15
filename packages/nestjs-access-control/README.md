# @concepta/nestjs-access-control

Decide who may do what to which resource, by role and by system (such as
an integration or a scheduled job).
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
only `id` and `name`. A signed-in caller with no grant gets a `403` (its
`refusal`, in the exception's context for your logs, is `no-grant`). A call
that reaches the check with nobody acting gets a `403` too (`no-actor`);
with `@concepta/nestjs-authentication`, an unauthenticated call is answered
`401` before that. The response body never names the refusal.

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
- **`inverted: true`** makes the rule a deny. Add **`pending`** to a deny
  that waits on a decision, naming the gate that closes it; a refusal only
  pending denies take part in reports it as `gate`. See core's
  [Actor and Authority](../nestjs-core/README.md#actor-and-authority).

Rules are `AuthorityRuleInterface` from `@concepta/nestjs-core`, the shape
`@concepta/nestjs-repository`'s authority reads too. Actions and subjects
can be lists.

Type your rules as `AuthorityRuleInterface`: it defaults to the six
actions (`create` to `restore` above), so a mistyped verb fails to compile.
To add verbs of your own, widen it:
``AuthorityRuleInterface<`${ActionEnum}` | 'approve'>``. To narrow, list
only the verbs you allow: `AuthorityRuleInterface<'read' | 'update'>`.
`settings.grants` and a grants provider's `rulesFor` accept any verb, since
your routes may declare their own, so a typo there fails silently: a
mistyped allow grants nothing, and a mistyped deny denies nothing. Type the
rules you write as `AuthorityRuleInterface` before passing them in.

A rule set is refused, at startup or when it is loaded, for any problem
`authorityRuleProblems` lists: see
[core's rules](../nestjs-core/README.md#actor-and-authority) for the full
list. `settings.grants` is refused at startup, too, when a key is not
`role:<name>` or `system:<name>`.

`authorityRuleProblems(rules, source)` from `@concepta/nestjs-core` lists
every problem with a rule set, and `accessGrantsProblems(grants)` from this
package every problem with grants keyed by actor, keys included, so a
screen that edits rules can check them before saving.

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

With a [shared authority](#sharing-rules-with-the-repository), the authority
allows instead, outside `except`: there your rules can only take access
away, by denying it, never by leaving it out.

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
    authority: { authority, except: ['report'] },
    actorResolver,
  }),
});
```

- **The authority decides each route first.** A route's resource is read
  as the authority's subject and its action as the verb, so
  `@AccessControlDeleteOne('invoice')` asks whether the actor may `delete`
  an `invoice`. A refusal is a `403` with refusal `authority`, before the
  handler runs. Name a route's resource as the entity is keyed in
  `RepositoryModule.forRoot()`: a misspelled one is refused by the
  authority, so the mistake shows. Which rows the caller reaches is row
  scope's job; the repository then decides each read and write by the same
  rules, columns included.
- **Write your routes' own verbs in the authority's rules too.** A
  repository asks only `create`, `read`, `update`, `delete`, `softDelete`
  and `restore`, but the shared authority is also asked each route's own
  verbs (such as `approve`) on every resource not in `except`. A
  `CaslAuthority` refuses rules naming a verb, or a resource that isn't an
  entity it governs, until you declare it
  ([Rules with CASL](../nestjs-repository/README.md#rules-with-casl)).
- **Access control asks about the action only.** Its route checks, `can`
  and `assert` ask with no columns: the action, and also `read` when the
  action isn't `read`, since a write's response shows what a read would. A
  custom authority answers them by the action. Under a shared
  `CaslAuthority`, unusable authority rules fail these checks with
  `CaslAuthorityRulesInvalidException`
  (`CASL_AUTHORITY_RULES_INVALID_ERROR`); access control's own unusable
  rules still fail with `AccessRulesInvalidException`. Columns are enforced
  where data passes through a governed repository: a handler that returns
  data from elsewhere, such as a cache or another service, is not filtered
  by the authority's column rules.
- **`except` names the routes that are yours alone.** A route on a resource
  no entity stands behind, such as `@AccessControlGrant({ resource:
  'report', action: 'export' })`, is decided by your rules as if there
  were no authority, once its resource is in `except`: nothing is allowed
  without a rule allowing it. Until then, the authority refuses it.
- **Elsewhere, your own rules only narrow, by denying.**
  `settings.grants` and a grants provider still apply, but can never allow
  what the authority refuses:
  their denies count, their allows don't. Deny a field to hide it from one
  API's responses, or to refuse it in `assertFields`.
- `can` and `assert` in handlers decide the same way, asking about the
  action only. Their `fields` are checked against access control's own
  denies only; the authority's column rules hold where data passes through
  a governed repository.

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
  One exception: on generated CRUD routes, CRUD passes query fields
  (`select`, `filter`, `or`, `sort` and `s`) to the repository unrenamed,
  so they name stored columns (see [CRUD Routes](#crud-routes)).

Without an authority, your rules decide alone, as everywhere else in this
README. See the [Shared rules](./examples/shared-rules) example.

## Who Is Acting

The actor is a person acting through their roles, or a system acting on
its own authority, such as an integration or a scheduled job:

```ts
{ kind: 'role', roles: ['admin'], userId: 'u-42' }
{ kind: 'system', name: 'billing' }
```

For HTTP, pass an `actorResolver` (`AccessActorResolverInterface`) that
reads the authenticated user from the request. Returning `undefined` means
nobody is acting. It is asked whenever the module needs an actor and the
call carries no `ActorCtx`: on HTTP by `AccessContextOverlay` and by a
grant's guard, with the call's execution context as `context`; with
`context` undefined by a grant's guard on other transports, and by `can`,
`assert` and `effectiveRules` everywhere:

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

The check runs after every global guard, so a global authentication guard
has already put the user on the request. With
`@concepta/nestjs-authentication`, the resolver can read `AuthUserCtx` from
the call's context instead of `request.user`. A guard built with
`AuthGuard()` that authenticates the call defines it. When none did (a
public route, or a guard of yours that set only `request.user`), a
resolver asked before `AuthUserContextOverlay` runs, from a grant's guard
or from `AccessContextOverlay`, finds `AuthUserCtx` not yet defined (see
authentication's
[Context Overlay](../nestjs-authentication/README.md#context-overlay)), so
check `supports(AuthUserCtx)` first:

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

- keep the authentication guard global (the default);
- or put its `@UseGuards` *below* the access decorator at the same level,
  both on the controller or both on the method: the lower decorator's guard
  runs first. A guard on the controller runs before one on a method.

```ts
@Get()
@AccessControlReadMany('invoice')
@UseGuards(JwtGuard)
list() {
  // ...
}
```

`@AuthPublic()` turns off the JWT guard and any guard built with
`canDisable: true`. With only the JWT guard, a public route has no
signed-in user, so a grant on it refuses every caller with `no-actor`. A
guard that can't be turned off, such as `LocalGuard` or `RefreshGuard`,
still authenticates there, and a global guard of your own that defines
`ActorCtx`, such as an API-key guard, still gets its system through. For a
public route that still recognises signed-in callers, use
`@AuthPublic({ optional: true })`: a valid token signs the caller in, and a
`401` from the guard leaves the call anonymous.

With the global JWT guard, a caller without a token, such as a system
sending only an API key, is refused (`401`) by that guard, whether your
API-key guard runs before it or after: mark the routes your API-key guard
serves
`@AuthPublic({ optional: true })`, or turn the global guard off
(`appGuard: false`).

Refuse inactive users in the guard that signs them in: the authentication
module's own sign-ins do, and a guard of your own must (see
authentication's
[Context Overlay](../nestjs-authentication/README.md#context-overlay)).
A resolver that returns no actor for them refuses only routes with a
grant, `assert` (and `can` answers `false`) and governed repository calls:
the user is still signed in everywhere else, and `@AuthUser()` sees them.
On a refresh route, the user is whoever holds the refresh token; keep
grants off routes that do anything but issue tokens.

With a resolver, the module defines `ActorCtx` (from
`@concepta/nestjs-core`) on the context of every HTTP call the resolver
finds an actor for, routes without a grant included. A route handler, and
anything it calls, checks with that actor, repositories governed by an
[authority](../nestjs-repository/README.md#object-authority) included.
Without an actor, `ActorCtx` stays undefined, and a governed repository
call refuses with refusal `no-actor` (`403`). When the resolver finds no
actor, the next check asks it again, so one request may ask it more than
once; cache in it if it reads a database.

Don't define `ActorCtx` in an HTTP interceptor of your own: redefining it
fails. On a checked route the module has already defined it, and elsewhere
it may have. On a route without a
grant, the module defines it in a global interceptor,
`AccessContextOverlay`, so your own guards and earlier interceptors don't
see it there yet.

The resolver is given a request only over HTTP: on other transports the
"request" is the message payload, which the sender controls. There, define
`ActorCtx` yourself, once per call, immutably, with `frozenActor(actor)`
(the immutable overlay freezes the top level, `frozenActor` freezes
`roles`). On RPC, define it in a guard that runs before a grant's guard (an
overlay is too late, since guards run before interceptors), or let the
resolver work the actor out from `ctx` alone; see core's
[RPC (preview)](../nestjs-core/README.md#rpc-preview). In a queue
consumer or a job, define it on the context it opens. An integration
consumer acting for another system defines
`{ kind: 'system', name: 'billing' }` on the context it opens for each
message:

```ts
import { ActorCtx, AppContextHost, frozenActor } from '@concepta/nestjs-core';

const ctx = new AppContextHost();
ctx.defineOverlay(
  ActorCtx,
  frozenActor({ kind: 'system', name: 'billing' }),
  { immutable: true },
);
```

A call carrying `ActorCtx` uses it, on HTTP too, where a guard of yours
that runs first, such as an API-key guard, may define it; the resolver is
asked only when it is absent. A system is checked against
`system:billing` rules only, never against the roles of whatever account
it runs under:

```ts
grants: {
  'system:billing': [{ action: 'update', subject: 'invoice' }],
}
```

## Rules at Runtime

To keep rules in your database, so an admin screen can edit them, pass a
`grantsProvider` (`AccessGrantsProviderInterface`). It is asked for the
actor's rules on every check, so an edit applies to the next call:

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
the template. Under a [shared authority](#sharing-rules-with-the-repository),
outside `except`, only the denies count: a per-user grid takes access away
by denying it, and leaving a rule out of it changes nothing.

Every rule set the provider returns is checked before use; a set that
breaks the rules in [Writing Rules](#writing-rules) fails the call with
`AccessRulesInvalidException`, a `500`. `rulesFor` returns the rules
or a promise of them. It is asked on every check, so cache in it; telling
other instances about an edit is up to the provider too.

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
controller, a decorator applies to every route in it, unless a route
declares its own.
A route with neither is not checked. To catch one at startup, turn on core's
[route audit](../nestjs-core/README.md#route-audit): this module adds the
`requireAcl` rule, which fails startup for a route that has no grant and
isn't marked public with core's `@PublicRoute()`, which every
`@AuthPublic()` form sets, `{ optional: true }` included. A public route is
exempt, so a missing grant there is not caught at startup. Exempt a
signed-in route every caller may call with the audit's
`allow: { requireAcl: ['GET /me'] }`.

Nothing, such as a cached response, lets a caller through a checked route
without the check: it runs after every global guard and before every
interceptor.

## Response Filtering

A checked route's response holds only the fields the caller may read,
under their `read` rules, whatever the route does. An update's response
shows what a read of the same record would, not what the caller may write.
A caller who may write but not read gets an empty response. On generated
CRUD routes over an entity an authority governs, though, most writes first
read the row as the caller, so the caller also needs `read` there (see
CRUD's
[Operation-to-Repository Mapping](../nestjs-crud/README.md#operation-to-repository-mapping)).
This filter applies access control's rules only: an
[authority's](#sharing-rules-with-the-repository) column rules hold where
data passes through a governed repository, so data a handler returns from
elsewhere, such as a cache, isn't filtered by them.

- each item of an array is filtered;
- a response is a page when its `data` is an array and its `count`,
  `total`, `page` and `pageCount` are numbers: each item of `data` is
  filtered, the counters are kept, and the page's other fields filtered.
  Otherwise `data` is filtered as an ordinary field;
- objects are filtered as they go over the wire, after `toJSON`. An
  instance with `toJSON` becomes the filtered plain result. An instance of
  your class without `toJSON` stays an instance of it, so a class
  serializer that runs after the filter still applies its own rules. On
  that instance, getters and methods the caller may not read are blanked: a
  serializer cannot send them, and later code cannot call them;
- a response with no fields, such as a string, cannot be filtered: it is
  sent only to a caller who may read the resource.

Register a class serializer, such as `ClassSerializerInterceptor`,
globally, in your root module's `providers`. It then runs after the filter,
on the filtered instance, so rule fields name the paths your handler
returns: a class's property names. With
`@Expose({ name: 'socialSecurity' }) ssn`, deny `ssn`. A serializer on a
route or controller (`@UseInterceptors`) runs before the filter on the way
out, so there rule fields must name the serialized names: deny
`socialSecurity`.

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

Register a response cache on the route with `@UseInterceptors`, or in a
module imported after `AccessControlModule`, never in the root module's
`providers`. It then runs after the filter, stores unfiltered responses,
and each caller's copy is filtered on the way out.

A cache that runs before the filter answers the call itself and sends what
it stored unfiltered: the first caller's view of a record would reach
every later caller. The filter is a global interceptor, and global
interceptors run in the order they are registered:

- your root module's providers are registered first;
- a module is registered where it is first imported, so a cache module
  also reached through a module imported earlier runs before the filter.

A cache that keeps a separate entry per caller may run anywhere, but must
drop a caller's entries when their rules change, or a field taken away
stays visible until the entry expires.

## Record Checks

A grant says what a caller may do to a resource, not which of its records.
Which records a caller reaches, their own or their tenant's, is a question
about the data:

- **On data in `@concepta/nestjs-repository`, it is row scope's.** A row
  scope resolver limits every read and write, through any route or none: a
  clerk to their own rows, a manager to their tenant, with values from the
  `RowScopeCtx` overlay you set from the signed-in user. See
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

Register the service with the module's `queryServices`. When it injects
your own providers, such as the store that knows who owns a record,
register it in your own module instead: the check finds it in any module.

- A route with access query services proceeds when one of them allows it,
  and is refused with refusal `access-query` otherwise.
- On a controller, `@AccessControlQuery` applies to every route, unless a
  route declares its own, which replace the controller's.
- Give the route a grant too. Access query services run only after one: on
  a route without a grant, each call fails, at request time, with
  `AccessControlException`, a `500`, rather than skip them.

Each one receives:

| Method | Returns |
| --- | --- |
| `getQuery()` | the grant the call got through on (`AccessQueryInterface`): actor, action, resource |
| `getActor()` | who is acting |
| `getContext()` | the call's context, as handlers receive it |
| `getAbility()` | the caller's CASL ability (`AccessAbility`), for further checks |
| `getRequest(property?)` | the request, or one of its properties; `undefined` outside HTTP |
| `getExecutionContext()` | the route's execution context |

In a handler, `AccessControlService.decision(ctx)` returns the same grant,
an `AccessQueryInterface`: who is acting and the action and resource the
call was let through on, or `undefined` on a call no route checked.

The two answer a caller differently. A record an access query service
refuses is a `403`, which can tell the caller the record exists, unless the
service refuses a missing record the same way, as the
[Ownership](./examples/ownership) example's does. Row scope
leaves a row outside the caller's reach out of every read, so the route
answers as it would for a missing record, a `404`. Where even a record's
existence is private, use row scope.

## Checking in Handlers

The route guard checks the resource, not the body. In a checked route's
handler, pass the fields a write touches to `assertFields`. It checks access
control's own rules; an
[authority's](#sharing-rules-with-the-repository) column rules are checked
when the write reaches a governed repository:

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

It checks each field under the grant that let the caller in. On a route
with several grants, write field denies for each action the route grants.
It doesn't fetch the caller's rules again. Called outside a checked route,
it throws `AccessControlException`.

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
Under an [authority](#sharing-rules-with-the-repository), `fields` are
checked against access control's own denies only; the authority's column
rules hold where data passes through a governed repository.
`can` answers the same question with a boolean. Both take their options as
`AccessCheckOptionsInterface`.

## CRUD Routes

On routes generated by `@concepta/nestjs-crud`, declare each operation's
grant through `extraDecorators`, and register `AccessControlCrudPolicy` as
CRUD's request policy, so field denies hold there as on routes you write.
`@concepta/nestjs-crud` is an optional peer dependency: install it in your
application.

```ts
import { AccessControlCrudPolicy } from '@concepta/nestjs-access-control/optional/crud';

CrudModule.forRootAsync({
  inject: [AccessControlService],
  useFactory: (accessControl: AccessControlService) => ({
    requestPolicy: new AccessControlCrudPolicy(accessControl),
  }),
});
```

A module's own `requestPolicy` replaces the root's for that module: to keep
`AccessControlCrudPolicy`'s checks there, compose it into that policy.

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

- **Query input.** A `filter`, `or`, `sort` or `s` (search) naming a
  field the caller may not read is refused, on every operation: matching
  or ordering by `salary` tells its value without showing it. `select` is
  left to the response filter and the repository. CRUD passes query fields
  (`select`, `filter`, `or`, `sort` and `s`) to the repository unrenamed,
  so they name stored columns: when your response schema sends
  `total_cents` as `total`, deny both. The deny on `total` hides it from
  responses; the one on `total_cents` stops filtering and sorting by it.
  This policy runs before CRUD's own checks: when your own grants allow
  `read` only on named fields, with no authority deciding the resource, a
  `filter`, `or`, `sort` or `s` field naming no column is a `403` with
  refusal `field`. Otherwise CRUD checks the names itself (see CRUD's
  [Query Fields](../nestjs-crud/README.md#query-fields)). A column refused
  in the repository's authority is refused in every query, routes or not.
- **Write bodies.** A create, an update and each item of a batch create may
  touch only fields the caller may write, as `assertFields` checks them. A
  create and a batch create also write the route's params into the row, so
  those are checked as written fields too. Under the repository's
  authority, a create, batch create, update and replace all write the
  route's params, and those must be writable, except the primary key; a
  replace needs every column but the primary key writable (see CRUD's
  [Operation-to-Repository Mapping](../nestjs-crud/README.md#operation-to-repository-mapping)).
- **Replace.** A replace erases what its body leaves out, so it is refused
  whenever a field is denied to the caller for the action, or when the
  caller's only allows for it name fields.

What a request selects is not narrowed by these rules: the response filter
leaves out what the caller may not read. On an entity an authority
governs, the repository narrows a list or a read without `?select=` to the
caller's columns and refuses (`403`) a `?select=` naming a hidden one, and
most writes read the row first, as the caller (see CRUD's
[Query Fields](../nestjs-crud/README.md#query-fields)).

So a response may hold fewer fields than the entity: mark every field
that can be left out `.optional()` in the response schema (see CRUD's
[Serialization](../nestjs-crud/README.md#serialization)). Fields access
control's own rules deny are removed after serialization, so they need not
be optional.

Which rows a generated route reaches is row scope's job, on the entity's
repository. See the [CRUD routes](./examples/crud-routes) example.

## Showing Permissions in a UI

`AccessControlService.effectiveRules` returns the rules the actor is
decided by, denies last, so a UI can grey out what they cannot do. It needs
no grant of its own:

```ts
@Get('me/permissions')
permissions(@Ctx() ctx: AppContextHost) {
  return this.accessControl.effectiveRules(ctx);
}
```

Each rule holds only what decides, `action`, `subject`, `fields` and
`inverted`: a gate (`pending`) or a `reason` stays out of the response.
CASL's frontend packages read the result, but match fields their own way:
here a field covers everything beneath it (a deny on `address` refuses
`address.city`), and a write of a field is refused when a field beneath it
is denied, which no rule spells out. Give the frontend's ability a field
matcher that does the same, or treat its answer for nested fields as a
hint the API may still refuse.

With an [authority](#sharing-rules-with-the-repository) that gives its
rules, as `CaslAuthority` does, they are combined the way they decide: on
resources in `except`, the actor's own rules; elsewhere, the authority's
allows, less its denies and the actor's. The authority's rules name stored
columns in `fields`, matched by exact name, and yours name API fields, so
where a mapper renames a field the UI sees both names, and the response
shows the caller those stored column names. A custom authority gives its rules by
implementing `rulesFor(ctx, actor)` from `AuthorityInterface`; without it,
these are only the actor's own rules, and what the caller may do outside
`except` is the authority's allows less these denies, which the UI has to
build from both.

## Options

| Option | Default | Purpose |
| --- | --- | --- |
| `settings.grants` | `{}` | `AccessGrants`: rules keyed `role:<name>` or `system:<name>`. Used, and checked at startup, only without a `grantsProvider`. |
| `actorResolver` | none | `AccessActorResolverInterface`: works out who is acting when a call carries no `ActorCtx`. |
| `grantsProvider` | `StaticAccessGrantsProvider`, over `settings.grants` | `AccessGrantsProviderInterface`: supplies an actor's rules on every check. |
| `authority` | none | `AccessControlAuthorityInterface`, `{ authority, except? }`: decides each route first, except on resources in `except`; the actor's rules then only narrow. See [Sharing Rules with the Repository](#sharing-rules-with-the-repository). |
| `appFilter` | `AccessControlFilter`, the response filter | Replace it, or `false` for none. |
| `queryServices` | `[]` | Access query services to register. |

`AccessControlModule` offers `forRoot` and `forRootAsync`, which make it
available everywhere, plus `register`, `registerAsync` and `forFeature`.
With `register`, register it once and import that module into every module
whose controllers use the decorators: their guard needs
`AccessControlService`. `forFeature` overrides options for one module and
needs `forRoot` or `forRootAsync` beside it; it adds no response filter or
actor overlay of its own.

### Constructing by hand

To build `AccessControlService` yourself, pass it:

- your resolver, wrapped in `ActorCtxResolver`, so a call's `ActorCtx`
  wins over it;
- a grants provider;
- an `AccessCtxDecisionSource`, which finds the grant the route guard
  recorded (`AccessDecisionSourceInterface`, returning an
  `AccessDecisionInterface`: the grant and the caller's ability).

`AccessControlCrudPolicy` takes the service and, optionally, the same
decision source. Register `AccessContextOverlay` as a global interceptor to
define `ActorCtx` from your resolver on every HTTP call.

A guard of your own can decide a call with the service's methods, in this
order. It can refuse, but it records no grant: the response filter,
`AccessControlCrudPolicy`, `assertFields` and `decision(ctx)` act only
behind the route guard the grant decorators add, so keep those decorators
on any route whose responses or fields must be checked.

| Method | Returns |
| --- | --- |
| `resolve(ctx, context?)` | the actor, their checked rules and ability (`AccessResolutionInterface`), or `undefined` when nobody is acting |
| `authorize(ctx, resolution, action, resource)` | what the authority allows (`AccessAuthorization`): the resolution to check, or the refusal |
| `refusal(resolution, action, resource, options?)` | why the actor may not (`AccessRefusedDetailsInterface`), or `undefined` |

## Exceptions

| Exception | Status | Fault | `errorCode` | When |
| --- | --- | --- | --- | --- |
| `AccessControlException` | 500 | `usage` | `ACCESS_CONTROL_ERROR` | The base of the others; thrown itself for a route with access query services but no grant, or `assertFields` outside a checked route |
| `AccessRefusedException` | 403 | `client` | `ACCESS_REFUSED_ERROR` | A call is refused |
| `AccessRulesInvalidException` | 500 | `usage` | `ACCESS_RULES_INVALID_ERROR` | Access control's own rule set cannot be used. Under a shared `CaslAuthority`, unusable authority rules fail the route with `CaslAuthorityRulesInvalidException` (`CASL_AUTHORITY_RULES_INVALID_ERROR`) instead |

`AccessRefusedException`'s message names only the action and the resource,
such as `Not allowed to delete invoice`. The response body holds only
`statusCode`, `message`, `errorCode` and `error` (the status text). Its
context is for your logs and
never in the response: an `AccessRefusedDetailsInterface` naming the
`action`, the `resource`, the
`actor` (who they are only: their kind, and their roles and user id or
their name), and a `refusal`, one of `ACCESS_REFUSALS` (`AccessRefusal`):

| Refusal | Meaning |
| --- | --- |
| `no-actor` | Nobody is acting |
| `no-grant` | No rule allows it |
| `denied` | A deny refuses it (also names the first one's gate as `gate` when every deny of the whole resource that refused is `pending`) |
| `field` | A field it touches is refused (also names the first refused field in `fields`, when one field is to blame, and its `gate` when every deny refusing it is `pending`) |
| `access-query` | The route's access query service refused it |
| `authority` | The module's authority refuses it (also names any pending decision as `gate`) |

`AccessRulesInvalidException` lists every problem found, so one fix pass
covers them all.
