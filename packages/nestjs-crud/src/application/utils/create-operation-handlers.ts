import { Inject, Injectable, PlainLiteralObject, Type } from '@nestjs/common';

import { CrudAdapter } from '../../infrastructure/adapters/crud.adapter.js';
import { CrudControllerEntityInterface } from '../../infrastructure/interfaces/crud-controller-entity.interface.js';
import { CrudAdapterResolver } from '../../infrastructure/resolvers/crud-adapter.resolver.js';
import {
  CrudResolverInterface,
  CrudResolverStatic,
} from '../../infrastructure/resolvers/interfaces/crud-resolver.interface.js';
import {
  getControllerName,
  getDynamicAdapterToken,
} from '../../infrastructure/utils/crud-infra.utils.js';
import { CrudCommandHandlerInterface } from '../commands/interfaces/crud-command-handler.interface.js';
import { CrudQueryBaseHandler } from '../queries/handlers/crud-query-base.handler.js';

interface CreateHandlerOptionsBase extends CrudControllerEntityInterface {
  /** Method name for unique class naming */
  methodName?: string;
  /** Resolver class that controls decoration (defaults to CrudAdapterResolver) */
  resolverClass?: Type<CrudResolverInterface> & CrudResolverStatic;
}

interface CreateQueryHandlerOptions<
  Entity extends PlainLiteralObject,
> extends CreateHandlerOptionsBase {
  /** Base handler class to extend */
  baseClass: Type<CrudQueryBaseHandler<Entity>>;
  /** Query class for handler registration */
  queryClass: Type;
}

interface CreateCommandHandlerOptions<
  Entity extends PlainLiteralObject,
> extends CreateHandlerOptionsBase {
  /** Base handler class to extend */
  baseClass: Type<CrudCommandHandlerInterface<Entity>>;
  /** Command class for handler registration */
  commandClass: Type;
}

/**
 * Creates an entity-specific query handler class.
 *
 * Uses the provided resolver class to apply appropriate decorators.
 */
export function createQueryHandler<Entity extends PlainLiteralObject>(
  options: CreateQueryHandlerOptions<Entity>,
): Type<CrudQueryBaseHandler<Entity>> {
  const {
    entity,
    methodName,
    baseClass,
    queryClass,
    resolverClass = CrudAdapterResolver,
  } = options;
  const adapterToken = getDynamicAdapterToken(entity);
  const baseName = getControllerName(options);
  const nameParts = [baseName, methodName, 'Handler'].filter(Boolean);
  class HandlerClass extends baseClass {
    constructor(@Inject(adapterToken) adapter: CrudAdapter<Entity>) {
      super(adapter);
    }
  }
  Object.defineProperty(HandlerClass, 'name', {
    value: nameParts.join('_'),
  });

  // Apply @Injectable() universally to all handlers
  Injectable()(HandlerClass);

  // Let resolver add any additional decorators (e.g., @QueryHandler for CQRS)
  resolverClass.decorateQueryHandler(HandlerClass, queryClass);

  return HandlerClass;
}

/**
 * Creates an entity-specific command handler class.
 *
 * Uses the provided resolver class to apply appropriate decorators.
 */
export function createCommandHandler<Entity extends PlainLiteralObject>(
  options: CreateCommandHandlerOptions<Entity>,
): Type<CrudCommandHandlerInterface<Entity>> {
  const {
    entity,
    methodName,
    baseClass,
    commandClass,
    resolverClass = CrudAdapterResolver,
  } = options;
  const adapterToken = getDynamicAdapterToken(entity);
  const baseName = getControllerName(options);
  const nameParts = [baseName, methodName, 'Handler'].filter(Boolean);
  class HandlerClass extends baseClass {
    constructor(@Inject(adapterToken) adapter: CrudAdapter<Entity>) {
      super(adapter);
    }
  }
  Object.defineProperty(HandlerClass, 'name', {
    value: nameParts.join('_'),
  });

  // Apply @Injectable() universally to all handlers
  Injectable()(HandlerClass);

  // Let resolver add any additional decorators (e.g., @CommandHandler for CQRS)
  resolverClass.decorateCommandHandler(HandlerClass, commandClass);

  return HandlerClass;
}
