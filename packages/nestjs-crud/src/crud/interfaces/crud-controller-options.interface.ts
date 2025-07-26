import { ControllerOptions, PlainLiteralObject } from '@nestjs/common';

import { CrudValidationOptions } from '../../crud.types';

import { CrudModelOptionsInterface } from './crud-model-options.interface';
import { CrudParamsOptionsInterface } from './crud-params-options.interface';
import { CrudSerializationOptionsInterface } from './crud-serialization-options.interface';

export interface CrudControllerOptionsInterface<T extends PlainLiteralObject>
  extends ControllerOptions {
  model: CrudModelOptionsInterface;
  params?: CrudParamsOptionsInterface<T>;
  validation?: CrudValidationOptions<T>;
  serialization?: CrudSerializationOptionsInterface;
}
