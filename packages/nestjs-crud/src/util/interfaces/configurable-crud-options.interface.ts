import { InjectionToken, PlainLiteralObject, Type } from '@nestjs/common';

import { CrudAdapter } from '../../crud/adapters/crud.adapter';
import { CrudControllerOptionsInterface } from '../../crud/interfaces/crud-controller-options.interface';
import { CrudExtraDecoratorsInterface } from '../../crud/interfaces/crud-extra-decorators.interface';
import {
  CrudCreateManyOptionsInterface,
  CrudCreateOneOptionsInterface,
  CrudDeleteOneOptionsInterface,
  CrudReadAllOptionsInterface,
  CrudReadOneOptionsInterface,
  CrudRecoverOneOptionsInterface,
  CrudReplaceOneOptionsInterface,
  CrudUpdateOneOptionsInterface,
} from '../../crud/interfaces/crud-route-options.interface';

export interface ConfigurableCrudOptions<Entity extends PlainLiteralObject> {
  service: {
    injectionToken: InjectionToken;
    adapter: Type<CrudAdapter<Entity>>;
  };
  controller: CrudControllerOptionsInterface<Entity> &
    CrudExtraDecoratorsInterface;
  getMany?: CrudReadAllOptionsInterface<Entity> & CrudExtraDecoratorsInterface;
  getOne?: CrudReadOneOptionsInterface<Entity> & CrudExtraDecoratorsInterface;
  createMany?: CrudCreateManyOptionsInterface<Entity> &
    CrudExtraDecoratorsInterface;
  createOne?: CrudCreateOneOptionsInterface<Entity> &
    CrudExtraDecoratorsInterface;
  updateOne?: CrudUpdateOneOptionsInterface<Entity> &
    CrudExtraDecoratorsInterface;
  replaceOne?: CrudReplaceOneOptionsInterface<Entity> &
    CrudExtraDecoratorsInterface;
  deleteOne?: CrudDeleteOneOptionsInterface<Entity> &
    CrudExtraDecoratorsInterface;
  recoverOne?: CrudRecoverOneOptionsInterface<Entity> &
    CrudExtraDecoratorsInterface;
}
