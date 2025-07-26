import { SetMetadata } from '@nestjs/common';
import { ApiQueryOptions } from '@nestjs/swagger';

import { CRUD_MODULE_API_QUERY_METADATA } from '../../../crud.constants';
import { DecoratorTargetObject } from '../../../crud.types';
import { CrudException } from '../../../exceptions/crud.exception';
import { CrudReflectionService } from '../../../services/crud-reflection.service';
import { CrudApiQueryMetadataInterface } from '../../interfaces/crud-api-query-metadata.interface';

/**
 * \@CrudApiQuery() open api decorator
 */
export function CrudApiQuery(options?: ApiQueryOptions[]): MethodDecorator {
  return (target: DecoratorTargetObject, ...rest) => {
    const [propertyKey] = rest;

    if (typeof target === 'object') {
      const reflectionService = new CrudReflectionService();

      const previousValues = reflectionService.getApiQueryOptions(target) || [];

      const value: CrudApiQueryMetadataInterface = {
        propertyKey,
        options,
      };

      const values = [...previousValues, value];

      SetMetadata(CRUD_MODULE_API_QUERY_METADATA, values)(target);
    } else {
      throw new CrudException({
        message: 'Cannot decorate with api query, target must be a class',
      });
    }
  };
}
