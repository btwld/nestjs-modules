import { Injectable, PlainLiteralObject, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { DeepPartial } from '@concepta/nestjs-core';

import { CrudContextInterface } from '../interceptors/interfaces/crud-context.interface.js';
import { CrudCreateBatchInterface } from '../interfaces/crud-create-batch.interface.js';
import { CrudResponsePaginatedInterface } from '../interfaces/crud-response-paginated.interface.js';

import { CrudResolverInterface } from './interfaces/crud-resolver.interface.js';

/**
 * Operation resolver - creates query/command instances and calls handlers directly.
 *
 * This resolver uses query/command handlers but does NOT route through the CQRS bus.
 * Handlers are resolved directly via ModuleRef and invoked. Use this when you need
 * custom handler logic but don't need CQRS features like sagas or events.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     CrudModule.forRoot({
 *       defaultResolver: CrudOperationResolver,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class CrudOperationResolver implements CrudResolverInterface {
  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * No-op - handler is resolved directly via ModuleRef.
   */
  static decorateQueryHandler(_handlerClass: Type, _queryClass: Type): void {
    // No additional decorators needed
  }

  /**
   * No-op - handler is resolved directly via ModuleRef.
   */
  static decorateCommandHandler(
    _handlerClass: Type,
    _commandClass: Type,
  ): void {
    // No additional decorators needed
  }

  async list<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<CrudResponsePaginatedInterface<Entity>> {
    const QueryClass = ctx.options.route?.query;
    const HandlerClass = ctx.options.route?.queryHandler?.resolved;
    if (!QueryClass || !HandlerClass) {
      throw new Error('No query/handler configured for list operation');
    }
    return this.executeQuery(HandlerClass, new QueryClass(ctx));
  }

  async read<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<Entity> {
    const QueryClass = ctx.options.route?.query;
    const HandlerClass = ctx.options.route?.queryHandler?.resolved;
    if (!QueryClass || !HandlerClass) {
      throw new Error('No query/handler configured for read operation');
    }
    return this.executeQuery(HandlerClass, new QueryClass(ctx));
  }

  async create<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
    dto: DeepPartial<Entity>,
  ): Promise<Entity> {
    const CommandClass = ctx.options.route?.command;
    const HandlerClass = ctx.options.route?.commandHandler?.resolved;
    if (!CommandClass || !HandlerClass) {
      throw new Error('No command/handler configured for create operation');
    }
    return this.executeCommand(HandlerClass, new CommandClass(ctx, dto));
  }

  async createBatch<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
    dto: CrudCreateBatchInterface<DeepPartial<Entity>>,
  ): Promise<Entity[]> {
    const CommandClass = ctx.options.route?.command;
    const HandlerClass = ctx.options.route?.commandHandler?.resolved;
    if (!CommandClass || !HandlerClass) {
      throw new Error(
        'No command/handler configured for createBatch operation',
      );
    }
    return this.executeCommand(HandlerClass, new CommandClass(ctx, dto));
  }

  async update<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
    dto: DeepPartial<Entity>,
  ): Promise<Entity> {
    const CommandClass = ctx.options.route?.command;
    const HandlerClass = ctx.options.route?.commandHandler?.resolved;
    if (!CommandClass || !HandlerClass) {
      throw new Error('No command/handler configured for update operation');
    }
    return this.executeCommand(HandlerClass, new CommandClass(ctx, dto));
  }

  async replace<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
    dto: DeepPartial<Entity>,
  ): Promise<Entity> {
    const CommandClass = ctx.options.route?.command;
    const HandlerClass = ctx.options.route?.commandHandler?.resolved;
    if (!CommandClass || !HandlerClass) {
      throw new Error('No command/handler configured for replace operation');
    }
    return this.executeCommand(HandlerClass, new CommandClass(ctx, dto));
  }

  async delete<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<Entity | null> {
    const CommandClass = ctx.options.route?.command;
    const HandlerClass = ctx.options.route?.commandHandler?.resolved;
    if (!CommandClass || !HandlerClass) {
      throw new Error('No command/handler configured for delete operation');
    }
    return this.executeCommand(HandlerClass, new CommandClass(ctx));
  }

  async softDelete<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<Entity | null> {
    const CommandClass = ctx.options.route?.command;
    const HandlerClass = ctx.options.route?.commandHandler?.resolved;
    if (!CommandClass || !HandlerClass) {
      throw new Error(
        'No command/handler configured for soft delete operation',
      );
    }
    return this.executeCommand(HandlerClass, new CommandClass(ctx));
  }

  async restore<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<Entity | null> {
    const CommandClass = ctx.options.route?.command;
    const HandlerClass = ctx.options.route?.commandHandler?.resolved;
    if (!CommandClass || !HandlerClass) {
      throw new Error('No command/handler configured for restore operation');
    }
    return this.executeCommand(HandlerClass, new CommandClass(ctx));
  }

  /**
   * Execute a query handler. Return type is determined by the caller.
   */
  private executeQuery<T>(handlerClass: Type, query: unknown): Promise<T> {
    const handler = this.moduleRef.get(handlerClass, { strict: false });
    return handler.execute(query);
  }

  /**
   * Execute a command handler. Return type is determined by the caller.
   */
  private executeCommand<T>(handlerClass: Type, command: unknown): Promise<T> {
    const handler = this.moduleRef.get(handlerClass, { strict: false });
    return handler.execute(command);
  }
}
