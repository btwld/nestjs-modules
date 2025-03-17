import { SetMetadata } from '@nestjs/common';
import { CRUD_MODULE_PARAM_BODY_METADATA } from '../../crud.constants';
import { DecoratorTargetObject } from '../../crud.types';
import { CrudBodyOptionsInterface } from '../../interfaces/crud-body-options.interface';
import { CrudValidationMetadataInterface } from '../../interfaces/crud-validation-metadata.interface';
import { CrudReflectionService } from '../../services/crud-reflection.service';
import { CrudException } from '../../exceptions/crud.exception';

/**
 * \@CrudBody() parameter decorator
 */
export function CrudBody(
  options?: CrudBodyOptionsInterface,
): ParameterDecorator {
  return (target: DecoratorTargetObject, ...rest) => {
    const [propertyKey, parameterIndex] = rest;

    if (!('__proto__' in target)) {
      throw new CrudException({
        message: 'Cannot decorate with body, target must be a class',
      });
    }

    const reflectionService = new CrudReflectionService();

    const previousValues = reflectionService.getBodyParamOptions(target) || [];

    const value: CrudValidationMetadataInterface = {
      propertyKey,
      parameterIndex,
      validation: options?.validation,
      pipes: options?.pipes ?? [],
    };

    const values = [...previousValues, value];

    SetMetadata(CRUD_MODULE_PARAM_BODY_METADATA, values)(target);
  };
}
