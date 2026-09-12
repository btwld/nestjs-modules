import { type PlainLiteralObject } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { type CrudContextInterface } from '../../../infrastructure/interceptors/interfaces/crud-context.interface.js';

import { CrudWithBodyCommand } from './crud-with-body.command.js';

export class CrudCreateCommand<
  Entity extends PlainLiteralObject,
  Creatable extends DeepPartial<Entity> = DeepPartial<Entity>,
> extends CrudWithBodyCommand<Entity, Creatable> {
  constructor(
    public readonly context: CrudContextInterface<Entity>,
    public readonly dto: Creatable,
  ) {
    super(context, dto);
  }
}
