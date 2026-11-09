import { type PlainLiteralObject } from '@nestjs/common';

import { ActionEnum, AppContextHost, Operation } from '@concepta/nestjs-core';

import { CrudCtx } from '../../../infrastructure/interceptors/crud-context.overlay.js';
import { type CrudContextOptionsInterface } from '../../../infrastructure/interceptors/interfaces/crud-context-options.interface.js';
import { type CrudContextInterface } from '../../../infrastructure/interceptors/interfaces/crud-context.interface.js';

import { mockCrudParsedQuery } from './crud-parsed-query.mock.js';

// `options` (route/command/query class types) is never varied per entity
// shape in practice, unlike `query`/`params` below — typing it generically
// over `T` would claim `CrudContextOptionsInterface<T>` is assignable to
// the concrete `CrudContextOptionsInterface` `defineOverlay` stores it as,
// which isn't true in general (`CrudRouteOptionsInterface<T>`'s `Type<...>`
// fields aren't covariant in `T`). Omit it from the generic shape instead.
export function mockCrudContext<T extends PlainLiteralObject>(
  overrides: Partial<Omit<CrudContextInterface<T>, 'options'>> & {
    options?: CrudContextOptionsInterface<PlainLiteralObject>;
  } = {},
) {
  const ctx = new AppContextHost();

  ctx.defineOverlay(CrudCtx, {
    entity: overrides.entity ?? 'TestEntity',
    params: overrides.params ?? {},
    query: overrides.query ?? mockCrudParsedQuery(),
    options: overrides.options ?? {},
    operation: overrides.operation ?? Operation.Read,
    action: overrides.action ?? ActionEnum.READ,
  });

  return ctx.with(CrudCtx);
}
