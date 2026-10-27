import { type PlainLiteralObject } from '@nestjs/common';

import { type CrudAdapter } from '../../../infrastructure/adapters/crud.adapter.js';
import { type CrudCommandHandlerInterface } from '../interfaces/crud-command-handler.interface.js';
import { type CrudCommandInterface } from '../interfaces/crud-command.interface.js';

/**
 * Base class for CRUD command handlers.
 *
 * This class does NOT implement ICommandHandler directly. The resolver
 * applies the `@CommandHandler` decorator if CQRS is being used.
 */
export class CrudCommandBaseHandler<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> implements CrudCommandHandlerInterface<Entity> {
  constructor(readonly crudAdapter: CrudAdapter<Entity>) {}

  execute(
    _command: CrudCommandInterface<Entity>,
  ): Promise<Entity | Entity[] | null> {
    throw new Error('Method not implemented');
  }
}
