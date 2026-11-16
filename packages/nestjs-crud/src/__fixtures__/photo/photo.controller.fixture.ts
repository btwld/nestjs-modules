import { Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Ctx } from '@concepta/nestjs-core';

import { CrudCreateBatchCommand } from '../../application/commands/impl/crud-create-batch.command.js';
import { CrudCreateCommand } from '../../application/commands/impl/crud-create.command.js';
import { CrudDeleteCommand } from '../../application/commands/impl/crud-delete.command.js';
import { CrudReplaceCommand } from '../../application/commands/impl/crud-replace.command.js';
import { CrudRestoreCommand } from '../../application/commands/impl/crud-restore.command.js';
import { CrudSoftDeleteCommand } from '../../application/commands/impl/crud-soft-delete.command.js';
import { CrudUpdateCommand } from '../../application/commands/impl/crud-update.command.js';
import { CrudListQuery } from '../../application/queries/impl/crud-list.query.js';
import { CrudReadQuery } from '../../application/queries/impl/crud-read.query.js';
import { CrudController } from '../../infrastructure/decorators/controller/crud-controller.decorator.js';
import { CrudCreateBatch } from '../../infrastructure/decorators/operations/crud-create-batch.decorator.js';
import { CrudCreate } from '../../infrastructure/decorators/operations/crud-create.decorator.js';
import { CrudDelete } from '../../infrastructure/decorators/operations/crud-delete.decorator.js';
import { CrudList } from '../../infrastructure/decorators/operations/crud-list.decorator.js';
import { CrudRead } from '../../infrastructure/decorators/operations/crud-read.decorator.js';
import { CrudReplace } from '../../infrastructure/decorators/operations/crud-replace.decorator.js';
import { CrudRestore } from '../../infrastructure/decorators/operations/crud-restore.decorator.js';
import { CrudSoftDelete } from '../../infrastructure/decorators/operations/crud-soft-delete.decorator.js';
import { CrudUpdate } from '../../infrastructure/decorators/operations/crud-update.decorator.js';
import { CrudBody } from '../../infrastructure/decorators/params/crud-body.decorator.js';
import { CrudCtx } from '../../infrastructure/interceptors/crud-context.overlay.js';
import { CrudContextInterface } from '../../infrastructure/interceptors/interfaces/crud-context.interface.js';
import { type CrudCreateBatchInterface } from '../../infrastructure/interfaces/crud-create-batch.interface.js';
import { CrudAdapterResolver } from '../../infrastructure/resolvers/crud-adapter.resolver.js';
import { CrudResolverInterface } from '../../infrastructure/resolvers/interfaces/crud-resolver.interface.js';

import { type PhotoCreatableInterfaceFixture } from './interfaces/photo-creatable.interface.fixture.js';
import { PhotoEntityInterfaceFixture } from './interfaces/photo-entity.interface.fixture.js';
import { type PhotoUpdatableInterfaceFixture } from './interfaces/photo-updatable.interface.fixture.js';
import {
  photoCreateBatchResponseSchema,
  photoCreateBatchSchema,
} from './schemas/photo-create-batch.schema.fixture.js';
import { photoCreateSchema } from './schemas/photo-create.schema.fixture.js';
import { photoPaginatedSchema } from './schemas/photo-paginated.schema.fixture.js';
import { photoUpdateSchema } from './schemas/photo-update.schema.fixture.js';
import { photoSchema } from './schemas/photo.schema.fixture.js';

/**
 * Photo controller.
 */
@CrudController({
  path: 'photo',
  entity: 'Photo',
  request: { body: photoSchema },
  response: { resource: photoSchema, paginated: photoPaginatedSchema },
})
@ApiTags('photo')
export class PhotoControllerFixture {
  constructor(
    @Inject(CrudAdapterResolver)
    protected readonly crudResolver: CrudResolverInterface,
  ) {}

  @CrudList({ query: CrudListQuery })
  async list(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.crudResolver.list(ctx);
  }

  @CrudRead({ query: CrudReadQuery })
  async read(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.crudResolver.read(ctx);
  }

  @CrudCreateBatch({
    command: CrudCreateBatchCommand,
    request: { bodyBatch: photoCreateBatchSchema },
    response: {
      serialization: { resource: photoCreateBatchResponseSchema },
    },
  })
  async createBatch(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
    // Explicit schema — validation would also resolve from this operation's
    // `request.body`/`bodyBatch` fallback; passing it here pins it on the
    // parameter itself.
    @CrudBody({ schema: photoCreateBatchSchema })
    photoCreateBatchDto: CrudCreateBatchInterface<PhotoCreatableInterfaceFixture>,
  ) {
    return this.crudResolver.createBatch(ctx, photoCreateBatchDto);
  }

  // `request.body` overrides the controller-level default for this
  // operation's validation and docs — `photoCreateSchema`, not the full
  // `photoSchema`, because the real Create payload never carries
  // `id`/`deletedAt`.
  @CrudCreate({
    command: CrudCreateCommand,
    request: { body: photoCreateSchema },
  })
  async create(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
    @CrudBody({ schema: photoCreateSchema })
    photoCreateDto: PhotoCreatableInterfaceFixture,
  ) {
    return this.crudResolver.create(ctx, photoCreateDto);
  }

  @CrudUpdate({
    command: CrudUpdateCommand,
    request: { body: photoUpdateSchema },
  })
  async update(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
    @CrudBody({ schema: photoUpdateSchema })
    photoUpdateDto: PhotoUpdatableInterfaceFixture,
  ) {
    return this.crudResolver.update(ctx, photoUpdateDto);
  }

  @CrudReplace({
    command: CrudReplaceCommand,
    request: { body: photoUpdateSchema },
  })
  async replace(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
    @CrudBody({ schema: photoUpdateSchema })
    photoCreateDto: PhotoCreatableInterfaceFixture,
  ) {
    return this.crudResolver.replace(ctx, photoCreateDto);
  }

  @CrudDelete({ command: CrudDeleteCommand })
  async delete(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.crudResolver.delete(ctx);
  }

  @CrudSoftDelete({ path: 'soft/:id', command: CrudSoftDeleteCommand })
  async softDelete(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.crudResolver.softDelete(ctx);
  }

  @CrudRestore({ command: CrudRestoreCommand })
  async restore(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.crudResolver.restore(ctx);
  }
}
