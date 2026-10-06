import { type PlainLiteralObject } from '@nestjs/common';

import { type CrudContextInterface } from '../../../infrastructure/interceptors/interfaces/crud-context.interface.js';

/**
 * Interface for CRUD command class instances.
 * Command classes take a context object and optional data, used for command operations.
 */
export interface CrudCommandInterface<Entity extends PlainLiteralObject> {
  readonly context: CrudContextInterface<Entity>;
}
