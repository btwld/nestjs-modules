import { type PlainLiteralObject } from '@nestjs/common';
import { MetadataScanner } from '@nestjs/core';
import { ApiParam, type ApiParamOptions } from '@nestjs/swagger';

import { CrudMetaview } from '../../services/crud-metaview.service.js';

/**
 * Crud initialize open api params decorator.
 *
 * Add an ApiParam to every method with a crud operation.
 */
export const CrudInitApiParams =
  <T extends PlainLiteralObject = PlainLiteralObject>(): ClassDecorator =>
  (classTarget) => {
    const reflectionService = new CrudMetaview<T>();
    const scanner = new MetadataScanner();
    const prototype = classTarget.prototype;

    for (const methodName of scanner.getAllMethodNames(prototype)) {
      const handler = Reflect.get(prototype, methodName);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);

      if (!descriptor) continue;

      const apiParamsOptions = reflectionService.getApiParamsOptions(handler);
      if (!apiParamsOptions?.length) continue;

      const paramsOptions = reflectionService.getAllParamOptions(
        classTarget,
        handler,
      );

      for (const options of apiParamsOptions) {
        // Use decorator's name option to look up matching route param config
        const paramName = options?.name;
        const routeParam = paramName
          ? paramsOptions?.[paramName]
          : Object.values(paramsOptions ?? {})[0];

        // ApiParamOptions is a union: ApiParamMetadata | ApiParamSchemaHost
        // - ApiParamMetadata has `type` and `enum` at top level (accepts Function like Number/String)
        // - ApiParamSchemaHost has `schema.type` and `schema.enum` (OpenAPI string format)
        const isSchemaHost = options && 'schema' in options;
        const schemaType = isSchemaHost ? options.schema?.type : undefined;
        const optType = isSchemaHost
          ? Array.isArray(schemaType)
            ? schemaType[0]
            : schemaType
          : options?.type;
        const optEnum = isSchemaHost ? options.schema?.enum : options?.enum;

        // Build final options: spread decorator options first, then set defaults
        // for any properties not explicitly provided
        const apiOptions: ApiParamOptions = {
          ...options,
          name: options?.name ?? routeParam?.field ?? '',
          type: optType ?? (routeParam?.type === 'number' ? Number : String),
          enum:
            optEnum ??
            (routeParam?.enum ? Object.values(routeParam.enum) : undefined),
          required: options?.required ?? true,
        };

        ApiParam(apiOptions)(prototype, methodName, descriptor);
      }
    }
  };
