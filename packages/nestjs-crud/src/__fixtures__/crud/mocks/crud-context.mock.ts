import { type PlainLiteralObject } from '@nestjs/common';

import { ActionEnum, AppContextHost, Operation } from '@concepta/nestjs-core';

import { CrudCtx } from '../../../infrastructure/interceptors/crud-context.overlay.js';
import { type CrudContextInterface } from '../../../infrastructure/interceptors/interfaces/crud-context.interface.js';

import { mockCrudParsedQuery } from './crud-parsed-query.mock.js';

export function mockCrudContext<T extends PlainLiteralObject>(
  overrides: Partial<CrudContextInterface<T>> = {},
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
