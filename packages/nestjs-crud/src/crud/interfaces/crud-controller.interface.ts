import { PlainLiteralObject } from '@nestjs/common';

import { DeepPartial } from '@concepta/nestjs-common';

import { AdditionalCrudMethodArgs } from '../../crud.types';

import { CrudCreateManyInterface } from './crud-create-many.interface';
import { CrudRequestInterface } from './crud-request.interface';
import { CrudResponsePaginatedInterface } from './crud-response-paginated.interface';

export interface CrudControllerInterface<
  Entity extends PlainLiteralObject,
  Creatable extends DeepPartial<Entity> = DeepPartial<Entity>,
  Updatable extends DeepPartial<Entity> = DeepPartial<Entity>,
  Replaceable extends Creatable = Creatable,
> {
  getMany?(
    crudRequest: CrudRequestInterface<Entity>,
    ...rest: AdditionalCrudMethodArgs
  ): Promise<CrudResponsePaginatedInterface<Entity> | Entity[]>;

  getOne?(
    crudRequest: CrudRequestInterface<Entity>,
    ...rest: AdditionalCrudMethodArgs
  ): Promise<Entity>;

  createOne?(
    crudRequest: CrudRequestInterface<Entity>,
    dto: Creatable,
    ...rest: AdditionalCrudMethodArgs
  ): Promise<Entity>;

  createMany?(
    crudRequest: CrudRequestInterface<Entity>,
    dto: CrudCreateManyInterface<Creatable>,
    ...rest: AdditionalCrudMethodArgs
  ): Promise<Entity[]>;

  updateOne?(
    crudRequest: CrudRequestInterface<Entity>,
    dto: Updatable,
    ...rest: AdditionalCrudMethodArgs
  ): Promise<Entity>;

  replaceOne?(
    crudRequest: CrudRequestInterface<Entity>,
    dto: Replaceable,
    ...rest: AdditionalCrudMethodArgs
  ): Promise<Entity>;

  deleteOne?(
    crudRequest: CrudRequestInterface<Entity>,
    ...rest: AdditionalCrudMethodArgs
  ): Promise<Entity | void>;

  recoverOne?(
    crudRequest: CrudRequestInterface<Entity>,
    ...rest: AdditionalCrudMethodArgs
  ): Promise<Entity | void>;
}
