import { HttpException, type PlainLiteralObject } from '@nestjs/common';

import { CrudQueryException } from '../../../infrastructure/exceptions/crud-query.exception.js';
import { type CrudDeleteCommand } from '../impl/crud-delete.command.js';

import { CrudCommandBaseHandler } from './crud-command-base.handler.js';

export class CrudDeleteHandler<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> extends CrudCommandBaseHandler<Entity> {
  async execute(command: CrudDeleteCommand<Entity>): Promise<Entity | null> {
    const { context } = command;

    try {
      return await this.crudAdapter.delete(context);
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new CrudQueryException(this.crudAdapter.entityName(), {
        originalError: e,
      });
    }
  }
}
