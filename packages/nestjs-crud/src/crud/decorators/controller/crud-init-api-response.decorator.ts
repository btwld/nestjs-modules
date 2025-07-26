import { CrudException } from '../../../exceptions/crud.exception';
import { CrudReflectionService } from '../../../services/crud-reflection.service';
import { applyApiResponse } from '../util/apply-api-response.decorator';

/**
 * CRUD init api response decorator.
 */
export const CrudInitApiResponse =
  (): ClassDecorator =>
  (...args: Parameters<ClassDecorator>) => {
    // get the args
    const [classTarget] = args;

    const reflectionService = new CrudReflectionService();

    // get the api response options
    const apiResponseMetadata =
      reflectionService.getApiResponseOptions(classTarget.prototype) ?? [];

    // loop all metadatas
    apiResponseMetadata.map((metadata) => {
      // break out the args
      const { propertyKey, action, options } = metadata;

      // need the descriptor
      const descriptor = Object.getOwnPropertyDescriptor(
        classTarget.prototype,
        propertyKey,
      );

      if (!descriptor) {
        throw new CrudException({
          message: 'Failed to get property descriptor',
        });
      }

      applyApiResponse(action, options)(classTarget, propertyKey, descriptor);
    });
  };
