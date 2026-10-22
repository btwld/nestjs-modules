import { type PlainLiteralObject } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { type CrudAdapter } from '../../../infrastructure/adapters/crud.adapter.js';
import { type CrudWithBodyCommand } from '../impl/crud-with-body.command.js';

import { CrudCommandBaseHandler } from './crud-command-base.handler.js';

export class CrudWithBodyCommandHandler<
  Entity extends PlainLiteralObject = PlainLiteralObject,
  Body extends DeepPartial<Entity> = DeepPartial<Entity>,
> extends CrudCommandBaseHandler<Entity> {
  constructor(readonly crudAdapter: CrudAdapter<Entity>) {
    super(crudAdapter);
  }

  execute(
    _command: CrudWithBodyCommand<Entity, Body>,
  ): Promise<Entity | Entity[]> {
    throw new Error('Method not implemented');
  }
}
