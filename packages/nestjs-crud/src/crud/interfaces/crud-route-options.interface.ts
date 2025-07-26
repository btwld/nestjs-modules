import { PlainLiteralObject, Type } from '@nestjs/common';
import {
  ApiBodyOptions,
  ApiOperationOptions,
  ApiParamOptions,
  ApiQueryOptions,
  ApiResponseOptions,
} from '@nestjs/swagger';

import { CrudValidationOptions } from '../../crud.types';

import {
  CrudCreateOneRouteOptionsInterface,
  CrudDeleteOneRouteOptionsInterface,
  CrudRecoverOneRouteOptionsInterface,
  CrudReplaceOneRouteOptionsInterface,
  CrudUpdateOneRouteOptionsInterface,
} from './crud-routes-options.interface';
import { CrudSerializationOptionsInterface } from './crud-serialization-options.interface';

export interface CrudRouteOptionsInterface<T extends PlainLiteralObject> {
  path?: string | string[];
  validation?: CrudValidationOptions<T>;
  serialization?: CrudSerializationOptionsInterface;
  api?: {
    operation?: ApiOperationOptions;
    query?: ApiQueryOptions[];
    params?: ApiParamOptions;
    body?: ApiBodyOptions;
    response?: ApiResponseOptions;
  };
}

export interface CrudRouteDtoOptionsInterface {
  dto?: Type;
}

export interface CrudCreateManyOptionsInterface<T extends PlainLiteralObject>
  extends CrudRouteOptionsInterface<T>,
    CrudRouteDtoOptionsInterface {}

export interface CrudCreateOneOptionsInterface<T extends PlainLiteralObject>
  extends CrudRouteOptionsInterface<T>,
    CrudCreateOneRouteOptionsInterface,
    CrudRouteDtoOptionsInterface {}

export interface CrudReadAllOptionsInterface<T extends PlainLiteralObject>
  extends CrudRouteOptionsInterface<T> {}

export interface CrudReadOneOptionsInterface<T extends PlainLiteralObject>
  extends CrudRouteOptionsInterface<T> {}

export interface CrudUpdateOneOptionsInterface<T extends PlainLiteralObject>
  extends CrudRouteOptionsInterface<T>,
    Pick<CrudUpdateOneRouteOptionsInterface, 'returnShallow'>,
    CrudRouteDtoOptionsInterface {}

export interface CrudReplaceOneOptionsInterface<T extends PlainLiteralObject>
  extends CrudRouteOptionsInterface<T>,
    Pick<CrudReplaceOneRouteOptionsInterface, 'returnShallow'>,
    CrudRouteDtoOptionsInterface {}

export interface CrudDeleteOneOptionsInterface<T extends PlainLiteralObject>
  extends CrudRouteOptionsInterface<T>,
    CrudDeleteOneRouteOptionsInterface {}

export interface CrudRecoverOneOptionsInterface<T extends PlainLiteralObject>
  extends CrudRouteOptionsInterface<T>,
    CrudRecoverOneRouteOptionsInterface {}
