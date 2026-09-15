import { type PlainLiteralObject } from '@nestjs/common';

import { type CrudAdapter } from '../../../infrastructure/adapters/crud.adapter.js';
import { CrudQueryException } from '../../../infrastructure/exceptions/crud-query.exception.js';
import { type CrudResponsePaginatedInterface } from '../../../infrastructure/interfaces/crud-response-paginated.interface.js';
import { type CrudQueryHandlerInterface } from '../interfaces/crud-query-handler.interface.js';
import { type CrudQueryInterface } from '../interfaces/crud-query.interface.js';

/**
 * Base class for CRUD query handlers.
 *
 * This class does NOT implement IQueryHandler directly. The resolver
 * applies the `@QueryHandler` decorator if CQRS is being used.
 */
export class CrudQueryBaseHandler<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> implements CrudQueryHandlerInterface<Entity> {
  constructor(readonly crudAdapter: CrudAdapter<Entity>) {}

  execute(
    _query: CrudQueryInterface<Entity>,
  ): Promise<Entity | CrudResponsePaginatedInterface<Entity>> {
    throw new CrudQueryException(this.crudAdapter.entityName(), {
      message: 'Subclass must implement execute()',
    });
  }
}
