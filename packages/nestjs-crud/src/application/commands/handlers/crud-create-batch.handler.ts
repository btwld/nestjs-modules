import { HttpException, type PlainLiteralObject } from '@nestjs/common';

import { CrudQueryException } from '../../../infrastructure/exceptions/crud-query.exception.js';
import { type CrudCreateBatchCommand } from '../impl/crud-create-batch.command.js';

import { CrudWithBodyCommandHandler } from './crud-with-body-command.handler.js';

export class CrudCreateBatchHandler<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Body extends Entity = Entity,
> extends CrudWithBodyCommandHandler<Entity> {
  async execute(
    command: CrudCreateBatchCommand<Entity, Body>,
  ): Promise<Entity[]> {
    const { context, dto } = command;

    try {
      return await this.crudAdapter.createBatch(context, dto);
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
