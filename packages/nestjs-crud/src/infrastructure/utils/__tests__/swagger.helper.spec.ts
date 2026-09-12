import { Operation } from '@concepta/nestjs-core';

import { Swagger } from '../swagger.helper.js';

describe('Swagger.createQueryParamsMeta', () => {
  it('does not include a join parameter for List — join is configured server-side via @CrudJoin(), not requestable per-call', () => {
    const meta = Swagger.createQueryParamsMeta(Operation.List);

    expect(meta.some((m) => m.description?.includes('relational'))).toBe(false);
  });

  it('does not include a join parameter for Read', () => {
    const meta = Swagger.createQueryParamsMeta(Operation.Read);

    expect(meta.some((m) => m.description?.includes('relational'))).toBe(false);
  });

  it('every returned parameter has a defined string name', () => {
    const meta = [
      ...Swagger.createQueryParamsMeta(Operation.List),
      ...Swagger.createQueryParamsMeta(Operation.Read),
    ];

    expect(meta.every((m) => typeof m.name === 'string')).toBe(true);
  });
});
