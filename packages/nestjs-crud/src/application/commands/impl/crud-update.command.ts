import { type PlainLiteralObject } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { type CrudContextInterface } from '../../../infrastructure/interceptors/interfaces/crud-context.interface.js';

import { CrudWithBodyCommand } from './crud-with-body.command.js';

export class CrudUpdateCommand<
  Entity extends PlainLiteralObject,
  Updatable extends DeepPartial<Entity> = DeepPartial<Entity>,
> extends CrudWithBodyCommand<Entity, Updatable> {
  constructor(
    public readonly context: CrudContextInterface<Entity>,
    public readonly dto: Updatable,
  ) {
    super(context, dto);
  }
}
