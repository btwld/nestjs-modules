import { PlainLiteralObject } from '@nestjs/common';
import { ApiParam, ApiParamOptions } from '@nestjs/swagger';

import { CrudException } from '../../../exceptions/crud.exception';
import { CrudReflectionService } from '../../../services/crud-reflection.service';

/**
 * Crud initialize open api params decorator.
 *
 * Add an ApiParam to every method with a crud action.
 */
export const CrudInitApiParams =
  <T extends PlainLiteralObject = PlainLiteralObject>(): ClassDecorator =>
  (...args: Parameters<ClassDecorator>) => {
    // get the args
    const [classTarget] = args;

    const reflectionService = new CrudReflectionService<T>();

    // get the api param options
    const apiParamsMetadata =
      reflectionService.getApiParamsOptions(classTarget.prototype) ?? [];

    // yes, loop all metadatas
    apiParamsMetadata.map((metadata) => {
      // break out the args
      const { propertyKey } = metadata;

      // need the descriptor
      const descriptor = Object.getOwnPropertyDescriptor(
        classTarget.prototype,
        propertyKey,
      );

      // sanity check
      if (!descriptor) {
        throw new CrudException({
          message: 'Did not find property descriptor',
        });
      }

      // get the route params options
      const paramsOptions = reflectionService.getAllParamOptions(
        classTarget,
        classTarget.prototype[propertyKey],
      );

      // create the api param decorator
      if (paramsOptions) {
        // loop all params options
        for (const p in paramsOptions) {
          // options for this property
          const propOpts = paramsOptions[p];

          // merge the options
          const apiOptions: ApiParamOptions = {
            name: propOpts.field ?? '',
            required: true,
            type: propOpts.type === 'number' ? Number : String,
            enum: propOpts?.enum ? Object.values(propOpts.enum) : undefined,
          };

          ApiParam(apiOptions)(classTarget.prototype, propertyKey, descriptor);
        }
      }
    });
  };
