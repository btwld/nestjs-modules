import { MetadataScanner } from '@nestjs/core';

import { CrudMetaview } from '../../services/crud-metaview.service.js';
import { applyApiResponse } from '../util/apply-api-response.decorator.js';

/**
 * CRUD init api response decorator.
 */
export const CrudInitApiResponse = (): ClassDecorator => (classTarget) => {
  const reflectionService = new CrudMetaview();
  const scanner = new MetadataScanner();
  const prototype = classTarget.prototype;

  for (const methodName of scanner.getAllMethodNames(prototype)) {
    const handler = Reflect.get(prototype, methodName);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);

    if (!descriptor) continue;

    // get the operation for this method
    const operation = reflectionService.getOperation(handler);
    if (!operation) continue;

    // get the api response options for this method
    const apiResponseOptions = reflectionService.getApiResponseOptions(handler);
    if (!apiResponseOptions?.length) continue;

    // apply response decorators for each option
    for (const options of apiResponseOptions) {
      applyApiResponse(operation, options)(classTarget, methodName, descriptor);
    }
  }
};
