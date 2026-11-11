import { Inject, Injectable, PlainLiteralObject, Type } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  QueryBus,
  QueryHandler,
} from '@nestjs/cqrs';

import { DeepPartial } from '@concepta/nestjs-core';

import { CRUD_REQUEST_POLICY_TOKEN } from '../../crud.constants.js';
import { CrudContextInterface } from '../interceptors/interfaces/crud-context.interface.js';
import { CrudCreateBatchInterface } from '../interfaces/crud-create-batch.interface.js';
import { CrudResponsePaginatedInterface } from '../interfaces/crud-response-paginated.interface.js';
import { CrudRequestPolicyInterface } from '../policies/interfaces/crud-request-policy.interface.js';

import { CrudResolverInterface } from './interfaces/crud-resolver.interface.js';

/**
 * CQRS resolver - uses QueryBus/CommandBus for dispatching.
 *
 * This resolver uses the full CQRS pattern. Queries and commands are dispatched
 * through their respective buses, enabling CQRS features like sagas, events,
 * and cross-module routing.
 *
 * Every operation asks the module's request policy before it is dispatched.
 *
 * Requires `@nestjs/cqrs`; import it from `@concepta/nestjs-crud/optional/cqrs`.
 *
 * @example
 * ```typescript
 * new ConfigurableCrudBuilder<UserEntity>({
 *   controller: { path: 'users', entity: 'user', resolver: CrudCqrsResolver },
 *   operations: [{ operation: Operation.List }],
 * });
 * ```
 */
@Injectable()
export class CrudCqrsResolver implements CrudResolverInterface {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    @Inject(CRUD_REQUEST_POLICY_TOKEN)
    private readonly policy: CrudRequestPolicyInterface,
  ) {}

  /**
   * Apply `@QueryHandler()` decorator to register the handler with CQRS QueryBus.
   */
  static decorateQueryHandler(handlerClass: Type, queryClass: Type): void {
    QueryHandler(queryClass)(handlerClass);
  }

  /**
   * Apply `@CommandHandler()` decorator to register the handler with CQRS CommandBus.
   */
  static decorateCommandHandler(handlerClass: Type, commandClass: Type): void {
    CommandHandler(commandClass)(handlerClass);
  }

  async list<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<CrudResponsePaginatedInterface<Entity>> {
    const QueryClass = ctx.options.route?.query;
    if (!QueryClass) {
      throw new Error('No query configured for list operation');
    }
    await this.policy.check({ ctx });
    return this.queryBus.execute(new QueryClass(ctx));
  }

  async read<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<Entity> {
    const QueryClass = ctx.options.route?.query;
    if (!QueryClass) {
      throw new Error('No query configured for read operation');
    }
    await this.policy.check({ ctx });
    return this.queryBus.execute(new QueryClass(ctx));
  }

  async create<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
    dto: DeepPartial<Entity>,
  ): Promise<Entity> {
    const CommandClass = ctx.options.route?.command;
    if (!CommandClass) {
      throw new Error('No command configured for create operation');
    }
    await this.policy.check({ ctx, body: dto });
    return this.commandBus.execute(new CommandClass(ctx, dto));
  }

  async createBatch<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
    dto: CrudCreateBatchInterface<DeepPartial<Entity>>,
  ): Promise<Entity[]> {
    const CommandClass = ctx.options.route?.command;
    if (!CommandClass) {
      throw new Error('No command configured for createBatch operation');
    }
    await this.policy.check({ ctx, body: dto });
    return this.commandBus.execute(new CommandClass(ctx, dto));
  }

  async update<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
    dto: DeepPartial<Entity>,
  ): Promise<Entity> {
    const CommandClass = ctx.options.route?.command;
    if (!CommandClass) {
      throw new Error('No command configured for update operation');
    }
    await this.policy.check({ ctx, body: dto });
    return this.commandBus.execute(new CommandClass(ctx, dto));
  }

  async replace<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
    dto: DeepPartial<Entity>,
  ): Promise<Entity> {
    const CommandClass = ctx.options.route?.command;
    if (!CommandClass) {
      throw new Error('No command configured for replace operation');
    }
    await this.policy.check({ ctx, body: dto });
    return this.commandBus.execute(new CommandClass(ctx, dto));
  }

  async delete<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<Entity | null> {
    const CommandClass = ctx.options.route?.command;
    if (!CommandClass) {
      throw new Error('No command configured for delete operation');
    }
    await this.policy.check({ ctx });
    return this.commandBus.execute(new CommandClass(ctx));
  }

  async softDelete<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<Entity | null> {
    const CommandClass = ctx.options.route?.command;
    if (!CommandClass) {
      throw new Error('No command configured for soft delete operation');
    }
    await this.policy.check({ ctx });
    return this.commandBus.execute(new CommandClass(ctx));
  }

  async restore<Entity extends PlainLiteralObject>(
    ctx: CrudContextInterface<Entity>,
  ): Promise<Entity | null> {
    const CommandClass = ctx.options.route?.command;
    if (!CommandClass) {
      throw new Error('No command configured for restore operation');
    }
    await this.policy.check({ ctx });
    return this.commandBus.execute(new CommandClass(ctx));
  }
}
