import { type PlainLiteralObject } from '@nestjs/common';
import { MetadataScanner } from '@nestjs/core';
import { ApiQuery } from '@nestjs/swagger';

import { CrudMetaview } from '../../services/crud-metaview.service.js';
import { isReadOperation } from '../../utils/crud-infra.utils.js';
import { Swagger } from '../../utils/swagger.helper.js';

/**
 * \@CrudInit() api query decorator.
 */
export const CrudInitApiQuery =
  <T extends PlainLiteralObject = PlainLiteralObject>(): ClassDecorator =>
  (classTarget) => {
    const reflectionService = new CrudMetaview<T>();
    const scanner = new MetadataScanner();
    const prototype = classTarget.prototype;

    for (const methodName of scanner.getAllMethodNames(prototype)) {
      const handler = Reflect.get(prototype, methodName);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);

      if (!descriptor) continue;

      // get the api query options for this method
      const apiQueryOptions = reflectionService.getApiQueryOptions(handler);
      if (!apiQueryOptions?.length) continue;

      // get the operation
      const operation = reflectionService.getOperation(handler);

      // only apply query params for queryable operations (List and Read)
      if (isReadOperation(operation)) {
        // use swagger helper to get the query
        const queryParamsMeta = Swagger.createQueryParamsMeta(operation);

        // the merged options
        const appliedParamsMap = new Map<string, boolean>();

        // flatten and filter options to only include those with a name property (NestJS 11 compatibility)
        const queryOptionsWithName = [
          ...apiQueryOptions.flat(),
          ...queryParamsMeta,
        ].filter(
          (option): option is NonNullable<typeof option> & { name: string } =>
            option !== undefined &&
            'name' in option &&
            typeof option.name === 'string',
        );

        // loop all of the options merged together, overrides first
        for (const queryOption of queryOptionsWithName) {
          // applied yet?
          if (!appliedParamsMap.has(queryOption.name)) {
            // apply the decorator
            ApiQuery(queryOption)(prototype, methodName, descriptor);
            // consider it done
            appliedParamsMap.set(queryOption.name, true);
          }
        }
      }
    }
  };
