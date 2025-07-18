import { SetMetadata } from '@nestjs/common';
import { ApiResponseOptions } from '@nestjs/swagger';

import { CRUD_MODULE_API_RESPONSE_METADATA } from '../../../crud.constants';
import { DecoratorTargetObject } from '../../../crud.types';
import { CrudException } from '../../../exceptions/crud.exception';
import { CrudReflectionService } from '../../../services/crud-reflection.service';
import { CrudActions } from '../../enums/crud-actions.enum';
import { CrudApiResponseMetadataInterface } from '../../interfaces/crud-api-response-metadata.interface';

/**
 * \@CrudApiResponse() open api decorator
 */
export function CrudApiResponse(
  action: CrudActions,
  options?: ApiResponseOptions,
): MethodDecorator {
  return (target: DecoratorTargetObject, ...rest) => {
    const [propertyKey] = rest;

    if (!('__proto__' in target)) {
      throw new CrudException({
        message: 'Cannot decorate with api response, target must be a class',
      });
    }

    const reflectionService = new CrudReflectionService();

    const previousValues =
      reflectionService.getApiResponseOptions(target) || [];

    const value: CrudApiResponseMetadataInterface = {
      propertyKey,
      action,
      options,
    };

    const values = [...previousValues, value];

    SetMetadata(CRUD_MODULE_API_RESPONSE_METADATA, values)(target);
  };
}
