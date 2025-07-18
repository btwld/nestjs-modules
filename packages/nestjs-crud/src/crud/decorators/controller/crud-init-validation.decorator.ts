import { Body, ValidationPipe } from '@nestjs/common';

import { CRUD_MODULE_DEFAULT_VALIDATION_PIPE_OPTIONS } from '../../../crud.constants';
import { CrudReflectionService } from '../../../services/crud-reflection.service';

/**
 * Crud initialize validation decorator.
 *
 * Add a ValidationPipe to every parameter called with the `CrudBody` decorator.
 */
export const CrudInitValidation =
  (): ClassDecorator =>
  (...args: Parameters<ClassDecorator>) => {
    // get the args
    const [classTarget] = args;

    // reflection service
    const reflectionService = new CrudReflectionService();

    // get the param options
    const bodyParamMetadata = reflectionService.getBodyParamOptions(
      classTarget.prototype,
    );

    // get the fallback validation options
    const fallbackOptions = reflectionService.getValidationOptions(classTarget);

    // do we have param validation metada?
    if (Array.isArray(bodyParamMetadata)) {
      // yes, loop all metadatas and set up the pipe
      bodyParamMetadata.map((metadata) => {
        // break out the args
        let { pipes = [] } = metadata;
        const { validation = fallbackOptions } = metadata;

        // are we injecting validation?
        if (validation !== false) {
          // yes, merge options
          const finalOptions = {
            ...CRUD_MODULE_DEFAULT_VALIDATION_PIPE_OPTIONS,
            ...validation,
          };

          // create new pipe
          const paramPipe = new ValidationPipe(finalOptions);

          // put our validation pipe first
          pipes = [paramPipe, ...pipes];
        }

        // create the body decorator
        Body(...pipes)(
          classTarget.prototype,
          metadata.propertyKey,
          metadata.parameterIndex,
        );
      });
    }
  };
