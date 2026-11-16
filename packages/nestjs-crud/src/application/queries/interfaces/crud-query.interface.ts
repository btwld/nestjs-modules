import { type PlainLiteralObject } from '@nestjs/common';

import { type CrudContextInterface } from '../../../infrastructure/interceptors/interfaces/crud-context.interface.js';

/**
 * Interface for CRUD query class instances.
 * Query classes take a context object and are used for read operations.
 */
export interface CrudQueryInterface<Entity extends PlainLiteralObject> {
  readonly context: CrudContextInterface<Entity>;
}
