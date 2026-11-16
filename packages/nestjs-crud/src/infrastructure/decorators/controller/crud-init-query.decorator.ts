import { Injectable, type Type } from '@nestjs/common';
import { MetadataScanner } from '@nestjs/core';

import { createQuery } from '../../../application/utils/create-operation-classes.js';
import { createQueryHandler } from '../../../application/utils/create-operation-handlers.js';
import { CrudDecoratorException } from '../../exceptions/crud-decorator.exception.js';
import { CrudAdapterResolver } from '../../resolvers/crud-adapter.resolver.js';
import { CrudMetaview } from '../../services/crud-metaview.service.js';
import {
  hasExplicitConstructor,
  getControllerName,
} from '../../utils/crud-infra.utils.js';
import { CrudQueryHandler } from '../routes/crud-query-handler.decorator.js';
import { CrudQuery } from '../routes/crud-query.decorator.js';
import { applyConstructorInjection } from '../util/apply-constructor-injection.decorator.js';

/**
 * Resolves query and query handler options for controller methods that have an operation.
 *
 * This decorator should be applied after operation decorators (CrudList, CrudRead, etc.)
 * to resolve deferred options and generate query/handler classes with proper names.
 *
 * Always re-resolves to support re-running after metadata changes.
 */
export const CrudInitQuery =
  (): ClassDecorator =>
  (...args: Parameters<ClassDecorator>) => {
    const [classTarget] = args;
    const prototype = classTarget.prototype;
    const reflectionService = new CrudMetaview();
    const scanner = new MetadataScanner();

    for (const methodName of scanner.getAllMethodNames(prototype)) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
      if (!descriptor) continue;

      // Only process methods that have an operation set
      const operation = reflectionService.getOperation(descriptor.value);
      if (!operation) continue;

      // Get stored query options
      const queryOptions = reflectionService.getQuery(descriptor.value);

      // Skip if no query options (operation uses commands instead)
      if (!queryOptions) continue;

      // Get entity and name from controller metadata
      const entity = reflectionService.getEntity(classTarget);
      const name = reflectionService.getName(classTarget);

      if (!entity) {
        throw new CrudDecoratorException({
          message: `CrudQuery on ${classTarget.name}.${methodName} requires controller entity (use @CrudEntity or @CrudController)`,
        });
      }

      const controllerName = getControllerName({ entity, name });

      // --- Resolve Query Class ---
      let resolvedQuery: Type;

      if (queryOptions.query) {
        resolvedQuery = queryOptions.query;
      } else if (queryOptions.queryTemplate) {
        resolvedQuery = createQuery(controllerName, queryOptions.queryTemplate);
      } else {
        throw new Error(
          `CrudQuery on ${classTarget.name}.${methodName} requires either query or queryTemplate`,
        );
      }

      // Update query metadata with resolved
      CrudQuery({ ...queryOptions, resolved: resolvedQuery })(
        prototype,
        methodName,
        descriptor,
      );

      // --- Resolve Query Handler ---
      const handlerOptions = reflectionService.getQueryHandler(
        descriptor.value,
      );

      // Handler options should always exist for query actions
      if (!handlerOptions) {
        throw new Error(
          `CrudQueryHandler on ${classTarget.name}.${methodName} requires handler options`,
        );
      }

      let resolvedHandler: Type;

      // Get the resolver class for handler decoration (controller > default)
      const resolverClass =
        reflectionService.getResolver(classTarget, descriptor.value) ??
        CrudAdapterResolver;

      if (handlerOptions.handler) {
        resolvedHandler = handlerOptions.handler;

        // Apply @Injectable() universally to all handlers
        Injectable()(resolvedHandler);

        // Let resolver add any additional decorators (e.g., @QueryHandler for CQRS)
        resolverClass.decorateQueryHandler(resolvedHandler, resolvedQuery);

        // If no explicit constructor, apply DI for adapter injection
        if (!hasExplicitConstructor(resolvedHandler)) {
          applyConstructorInjection(entity)(resolvedHandler);
        }
      } else if (handlerOptions.handlerTemplate) {
        resolvedHandler = createQueryHandler({
          entity,
          name,
          methodName,
          baseClass: handlerOptions.handlerTemplate,
          queryClass: resolvedQuery,
          resolverClass,
        });
      } else {
        throw new Error(
          `CrudQueryHandler on ${classTarget.name}.${methodName} requires either query or queryTemplate`,
        );
      }

      // Update handler metadata with resolved
      CrudQueryHandler({ ...handlerOptions, resolved: resolvedHandler })(
        prototype,
        methodName,
        descriptor,
      );
    }
  };
