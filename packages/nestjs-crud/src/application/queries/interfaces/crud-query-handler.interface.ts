import { type PlainLiteralObject } from '@nestjs/common';

import { type CrudAdapter } from '../../../infrastructure/adapters/crud.adapter.js';
import { type CrudResponsePaginatedInterface } from '../../../infrastructure/interfaces/crud-response-paginated.interface.js';

import { type CrudQueryInterface } from './crud-query.interface.js';

/**
 * The CRUD query handler interface.
 *
 * This interface defines the contract for query handlers without
 * coupling to `@nestjs/cqrs`. The resolver applies CQRS decorators
 * if needed at decoration-time.
 */
export interface CrudQueryHandlerInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  _Relations extends PlainLiteralObject[] = PlainLiteralObject[],
> {
  crudAdapter: CrudAdapter<Entity>;

  execute(
    query: CrudQueryInterface<Entity>,
  ): Promise<Entity | CrudResponsePaginatedInterface<Entity>>;
}
