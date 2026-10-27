import { type z } from 'zod';

import { Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Ctx } from '@concepta/nestjs-core';

import { CrudCreateCommand } from '../../../application/commands/impl/crud-create.command.js';
import { CrudDeleteCommand } from '../../../application/commands/impl/crud-delete.command.js';
import { CrudReplaceCommand } from '../../../application/commands/impl/crud-replace.command.js';
import { CrudReadQuery } from '../../../application/queries/impl/crud-read.query.js';
import { CrudController } from '../../../infrastructure/decorators/controller/crud-controller.decorator.js';
import { CrudCreate } from '../../../infrastructure/decorators/operations/crud-create.decorator.js';
import { CrudDelete } from '../../../infrastructure/decorators/operations/crud-delete.decorator.js';
import { CrudRead } from '../../../infrastructure/decorators/operations/crud-read.decorator.js';
import { CrudReplace } from '../../../infrastructure/decorators/operations/crud-replace.decorator.js';
import { CrudBody } from '../../../infrastructure/decorators/params/crud-body.decorator.js';
import { CrudCtx } from '../../../infrastructure/interceptors/crud-context.overlay.js';
import { CrudContextInterface } from '../../../infrastructure/interceptors/interfaces/crud-context.interface.js';
import { CrudAdapterResolver } from '../../../infrastructure/resolvers/crud-adapter.resolver.js';
import { CrudResolverInterface } from '../../../infrastructure/resolvers/interfaces/crud-resolver.interface.js';
import { userSchema } from '../schemas/user.schema.js';

type UserType = z.infer<typeof userSchema>;

@CrudController({
  path: 'user',
  entity: 'User',
  request: {
    body: userSchema,
    params: { username: { field: 'username', type: 'string', primary: true } },
  },
  response: { resource: userSchema },
})
@ApiTags('user')
export class UserController {
  constructor(
    @Inject(CrudAdapterResolver)
    protected readonly crudResolver: CrudResolverInterface,
  ) {}

  @CrudCreate({
    command: CrudCreateCommand,
    api: { operation: { operationId: 'createUser' } },
  })
  async createUser(
    @Ctx(CrudCtx) ctx: CrudContextInterface,
    // See pet.controller.ts's addPet for why `{ schema }` is required here.
    @CrudBody({ schema: userSchema }) dto: UserType,
  ) {
    return this.crudResolver.create(ctx, dto);
  }

  @CrudRead({
    query: CrudReadQuery,
    path: ':username',
    api: { operation: { operationId: 'getUserByName' } },
  })
  async getUserByName(@Ctx(CrudCtx) ctx: CrudContextInterface) {
    return this.crudResolver.read(ctx);
  }

  @CrudReplace({
    command: CrudReplaceCommand,
    path: ':username',
    api: { operation: { operationId: 'updateUser' } },
  })
  async updateUser(
    @Ctx(CrudCtx) ctx: CrudContextInterface,
    // See pet.controller.ts's addPet for why `{ schema }` is required here.
    @CrudBody({ schema: userSchema }) dto: UserType,
  ) {
    return this.crudResolver.replace(ctx, dto);
  }

  @CrudDelete({
    command: CrudDeleteCommand,
    path: ':username',
    api: { operation: { operationId: 'deleteUser' } },
  })
  async deleteUser(@Ctx(CrudCtx) ctx: CrudContextInterface) {
    return this.crudResolver.delete(ctx);
  }
}
