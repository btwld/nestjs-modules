import { type PlainLiteralObject } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { type CrudContextInterface } from '../../../infrastructure/interceptors/interfaces/crud-context.interface.js';
import { type CrudCreateBatchInterface } from '../../../infrastructure/interfaces/crud-create-batch.interface.js';
import { type CrudCommandInterface } from '../interfaces/crud-command.interface.js';

export class CrudWithBodyCommand<
  Entity extends PlainLiteralObject,
  Body extends DeepPartial<Entity> = DeepPartial<Entity>,
> implements CrudCommandInterface<Entity> {
  constructor(
    public readonly context: CrudContextInterface<Entity>,
    public readonly dto: Body | CrudCreateBatchInterface<Body>,
  ) {}
}
