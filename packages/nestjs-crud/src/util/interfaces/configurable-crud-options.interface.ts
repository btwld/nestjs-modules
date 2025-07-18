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
  controller: CrudControllerOptionsInterface & CrudExtraDecoratorsInterface;
  getMany?: CrudReadAllOptionsInterface & CrudExtraDecoratorsInterface;
  getOne?: CrudReadOneOptionsInterface & CrudExtraDecoratorsInterface;
  createMany?: CrudCreateManyOptionsInterface & CrudExtraDecoratorsInterface;
  createOne?: CrudCreateOneOptionsInterface & CrudExtraDecoratorsInterface;
  updateOne?: CrudUpdateOneOptionsInterface & CrudExtraDecoratorsInterface;
  replaceOne?: CrudReplaceOneOptionsInterface & CrudExtraDecoratorsInterface;
  deleteOne?: CrudDeleteOneOptionsInterface & CrudExtraDecoratorsInterface;
  recoverOne?: CrudRecoverOneOptionsInterface & CrudExtraDecoratorsInterface;
}
