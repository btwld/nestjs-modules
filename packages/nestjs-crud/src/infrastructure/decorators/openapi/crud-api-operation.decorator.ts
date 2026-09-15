import { ApiOperation, type ApiOperationOptions } from '@nestjs/swagger';

import { type DecoratorTargetObject } from '../../../crud.types.js';
import { CrudException } from '../../exceptions/crud.exception.js';

/**
 * \@CrudApiOperation() open api decorator
 */
export function CrudApiOperation(
  options?: ApiOperationOptions,
): MethodDecorator {
  return (classTarget: DecoratorTargetObject, ...rest) => {
    const [propertyKey] = rest;

    if ('__proto__' in classTarget) {
      const className = classTarget.constructor.name;
      const operationId: string = `${className}_${propertyKey.toString()}`;

      const mergedOptions: ApiOperationOptions = {
        operationId,
        ...options,
      };

      // need the descriptor
      const descriptor = Object.getOwnPropertyDescriptor(
        classTarget,
        propertyKey,
      );

      // sanity check
      if (!descriptor) {
        throw new CrudException({
          message: 'Did not find property descriptor',
          fault: 'usage',
        });
      }

      ApiOperation(mergedOptions)(
        classTarget.prototype,
        propertyKey,
        descriptor,
      );
    } else {
      throw new CrudException({
        message: 'Cannot decorate with api operation, target must be a class',
        fault: 'usage',
      });
    }
  };
}
