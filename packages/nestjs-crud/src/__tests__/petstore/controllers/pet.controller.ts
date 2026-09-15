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
import { petSchema } from '../schemas/pet.schema.js';

type PetType = z.infer<typeof petSchema>;

@CrudController({
  path: 'pet',
  entity: 'Pet',
  request: {
    body: petSchema,
    params: { petId: { field: 'petId', type: 'number', primary: true } },
  },
  response: { resource: petSchema },
})
@ApiTags('pet')
export class PetController {
  constructor(
    @Inject(CrudAdapterResolver)
    protected readonly crudResolver: CrudResolverInterface,
  ) {}

  @CrudCreate({
    command: CrudCreateCommand,
    api: { operation: { operationId: 'addPet' } },
  })
  async addPet(
    @Ctx(CrudCtx) ctx: CrudContextInterface,
    // `@CrudBody()` itself is required here (a handwritten controller's
    // parameter decorator is what wires `StandardSchemaValidationPipe`;
    // `ConfigurableCrudBuilder`-generated controllers do this
    // automatically) — though since #467 a bare `@CrudBody()` would
    // resolve `petSchema` from the controller's `request.body` too;
    // pinning it here just makes the parameter's own schema explicit.
    @CrudBody({ schema: petSchema }) dto: PetType,
  ) {
    return this.crudResolver.create(ctx, dto);
  }

  @CrudRead({
    query: CrudReadQuery,
    path: ':petId',
    api: { operation: { operationId: 'getPetById' } },
  })
  async getPetById(@Ctx(CrudCtx) ctx: CrudContextInterface) {
    return this.crudResolver.read(ctx);
  }

  @CrudReplace({
    command: CrudReplaceCommand,
    path: ':petId',
    api: { operation: { operationId: 'updatePetWithForm' } },
  })
  async updatePetWithForm(
    @Ctx(CrudCtx) ctx: CrudContextInterface,
    @CrudBody({ schema: petSchema }) dto: PetType,
  ) {
    return this.crudResolver.replace(ctx, dto);
  }

  @CrudDelete({
    command: CrudDeleteCommand,
    path: ':petId',
    api: { operation: { operationId: 'deletePet' } },
  })
  async deletePet(@Ctx(CrudCtx) ctx: CrudContextInterface) {
    return this.crudResolver.delete(ctx);
  }
}
