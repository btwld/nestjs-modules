import { SetMetadata } from '@nestjs/common';
import { ApiParamOptions } from '@nestjs/swagger';

import { CRUD_MODULE_API_PARAMS_METADATA } from '../../../crud.constants';
import { DecoratorTargetObject } from '../../../crud.types';
import { CrudException } from '../../../exceptions/crud.exception';
import { CrudReflectionService } from '../../../services/crud-reflection.service';
import { CrudApiParamMetadataInterface } from '../../interfaces/crud-api-param-metadata.interface';

/**
 * \@CrudApiParam() open api decorator
 */
export function CrudApiParam(options?: ApiParamOptions): MethodDecorator {
  return (target: DecoratorTargetObject, ...rest) => {
    const [propertyKey] = rest;

    if (!('__proto__' in target)) {
      throw new CrudException({
        message: 'Cannot decorate with api param, target must be a class',
      });
    }

    const reflectionService = new CrudReflectionService();

    const previousValues = reflectionService.getApiParamsOptions(target) || [];

    const value: CrudApiParamMetadataInterface = {
      propertyKey,
      options,
    };

    const values = [...previousValues, value];

    SetMetadata(CRUD_MODULE_API_PARAMS_METADATA, values)(target);
  };
}
