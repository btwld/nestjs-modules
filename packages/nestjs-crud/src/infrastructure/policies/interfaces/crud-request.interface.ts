import { type PlainLiteralObject } from '@nestjs/common';

import { type CrudContextInterface } from '../../interceptors/interfaces/crud-context.interface.js';

/**
 * A CRUD request about to run: its context — the operation, the parsed
 * query, the route parameters — and, for a write, the validated body.
 */
export interface CrudRequestInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> {
  ctx: CrudContextInterface<Entity>;
  /**
   * The body of a create, update or replace; `{ bulk }` of a batch create.
   * Absent for every other operation.
   */
  body?: unknown;
}
