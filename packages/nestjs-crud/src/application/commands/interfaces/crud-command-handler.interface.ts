import { type PlainLiteralObject } from '@nestjs/common';

import { type CrudAdapter } from '../../../infrastructure/adapters/crud.adapter.js';

import { type CrudCommandInterface } from './crud-command.interface.js';

/**
 * The CRUD command handler interface.
 *
 * This interface defines the contract for command handlers without
 * coupling to `@nestjs/cqrs`. The resolver applies CQRS decorators
 * if needed at decoration-time.
 */
export interface CrudCommandHandlerInterface<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  _Relations extends PlainLiteralObject[] = PlainLiteralObject[],
> {
  readonly crudAdapter?: CrudAdapter<Entity>;

  execute(
    command: CrudCommandInterface<Entity>,
  ): Promise<Entity | Entity[] | null>;
}
