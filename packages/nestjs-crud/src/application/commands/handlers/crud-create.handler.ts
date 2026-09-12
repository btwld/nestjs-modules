import { HttpException, type PlainLiteralObject } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { CrudQueryException } from '../../../infrastructure/exceptions/crud-query.exception.js';
import { type CrudCreateCommand } from '../impl/crud-create.command.js';

import { CrudWithBodyCommandHandler } from './crud-with-body-command.handler.js';

export class CrudCreateHandler<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Body extends DeepPartial<Entity> = DeepPartial<Entity>,
> extends CrudWithBodyCommandHandler<Entity, Body> {
  async execute(command: CrudCreateCommand<Entity, Body>): Promise<Entity> {
    const { context, dto } = command;

    try {
      return await this.crudAdapter.create(context, dto);
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
