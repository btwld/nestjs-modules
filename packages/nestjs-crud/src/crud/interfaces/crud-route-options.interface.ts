import { Type } from '@nestjs/common';
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

export interface CrudRouteOptionsInterface {
  path?: string | string[];
  validation?: CrudValidationOptions;
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

export interface CrudCreateManyOptionsInterface
  extends CrudRouteOptionsInterface,
    CrudRouteDtoOptionsInterface {}

export interface CrudCreateOneOptionsInterface
  extends CrudRouteOptionsInterface,
    CrudCreateOneRouteOptionsInterface,
    CrudRouteDtoOptionsInterface {}

export interface CrudReadAllOptionsInterface
  extends CrudRouteOptionsInterface {}

export interface CrudReadOneOptionsInterface
  extends CrudRouteOptionsInterface {}

export interface CrudUpdateOneOptionsInterface
  extends CrudRouteOptionsInterface,
    Pick<CrudUpdateOneRouteOptionsInterface, 'returnShallow'>,
    CrudRouteDtoOptionsInterface {}

export interface CrudReplaceOneOptionsInterface
  extends CrudRouteOptionsInterface,
    Pick<CrudReplaceOneRouteOptionsInterface, 'returnShallow'>,
    CrudRouteDtoOptionsInterface {}

export interface CrudDeleteOneOptionsInterface
  extends CrudRouteOptionsInterface,
    CrudDeleteOneRouteOptionsInterface {}

export interface CrudRecoverOneOptionsInterface
  extends CrudRouteOptionsInterface,
    CrudRecoverOneRouteOptionsInterface {}
