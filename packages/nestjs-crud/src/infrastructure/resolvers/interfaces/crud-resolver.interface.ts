import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { type CrudContextInterface } from '../../interceptors/interfaces/crud-context.interface.js';
import { type CrudCreateBatchInterface } from '../../interfaces/crud-create-batch.interface.js';
import { type CrudResponsePaginatedInterface } from '../../interfaces/crud-response-paginated.interface.js';

/**
 * Interface for CRUD resolver implementations.
 *
 * Resolvers control how CRUD operations are dispatched:
 * - CrudAdapterResolver: calls adapter directly (simplest, no handlers)
 * - CrudOperationResolver: calls handlers directly (no CQRS bus)
 * - CrudCqrsResolver: uses QueryBus/CommandBus (full CQRS)
 *
 * Methods are generic to allow the same resolver instance to handle
 * multiple entity types.
 */
export interface CrudResolverInterface {
  list<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<CrudResponsePaginatedInterface<Entity>>;

  read<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<Entity>;

  create<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
    dto: DeepPartial<Entity>,
  ): Promise<Entity>;

  createBatch<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
    dto: CrudCreateBatchInterface<DeepPartial<Entity>>,
  ): Promise<Entity[]>;

  update<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
    dto: DeepPartial<Entity>,
  ): Promise<Entity>;

  replace<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
    dto: DeepPartial<Entity>,
  ): Promise<Entity>;

  delete<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<Entity | null>;

  softDelete<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<Entity | null>;

  restore<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<Entity | null>;
}

/**
 * Static methods that resolver classes must implement.
 *
 * These methods are called at decorator-time to apply the appropriate
 * decorators to handler classes.
 *
 * Note: This is used as an intersection type (ResolverType & CrudResolverStatic)
 * rather than `implements` since TypeScript doesn't check static members.
 */
export interface CrudResolverStatic {
  /**
   * Apply decorators to a query handler class.
   *
   * Called by CrudInitQuery decorator when resolving handler classes.
   */
  decorateQueryHandler(handlerClass: Type, queryClass: Type): void;

  /**
   * Apply decorators to a command handler class.
   *
   * Called by CrudInitCommand decorator when resolving handler classes.
   */
  decorateCommandHandler(handlerClass: Type, commandClass: Type): void;
}
