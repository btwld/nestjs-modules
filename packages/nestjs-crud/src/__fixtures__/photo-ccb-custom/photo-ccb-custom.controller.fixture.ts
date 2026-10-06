import { Inject } from '@nestjs/common';

import { Ctx } from '@concepta/nestjs-core';

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
import { CrudCreateBatchInterface } from '../../infrastructure/interfaces/crud-create-batch.interface.js';
import { CrudAdapterResolver } from '../../infrastructure/resolvers/crud-adapter.resolver.js';
import { CrudResolverInterface } from '../../infrastructure/resolvers/interfaces/crud-resolver.interface.js';
import { ConfigurableCrudBuilder } from '../../infrastructure/utils/configurable-crud.builder.js';
import { CRUD_TEST_PHOTO_CCB_CUSTOM_ENTITY_NAME } from '../crud-test.constants.js';
import { PhotoCreatableInterfaceFixture } from '../photo/interfaces/photo-creatable.interface.fixture.js';
import { PhotoEntityInterfaceFixture } from '../photo/interfaces/photo-entity.interface.fixture.js';
import { PhotoUpdatableInterfaceFixture } from '../photo/interfaces/photo-updatable.interface.fixture.js';
import {
  photoCreateBatchResponseSchema,
  photoCreateBatchSchema,
} from '../photo/schemas/photo-create-batch.schema.fixture.js';
import { photoCreateSchema } from '../photo/schemas/photo-create.schema.fixture.js';
import { photoPaginatedSchema } from '../photo/schemas/photo-paginated.schema.fixture.js';
import { photoUpdateSchema } from '../photo/schemas/photo-update.schema.fixture.js';
import { photoSchema } from '../photo/schemas/photo.schema.fixture.js';

@CrudController({
  path: 'photo',
  entity: CRUD_TEST_PHOTO_CCB_CUSTOM_ENTITY_NAME,
  request: { body: photoSchema },
  response: { resource: photoSchema, paginated: photoPaginatedSchema },
})
export class PhotoCcbCustomControllerFixture {
  constructor(
    @Inject(CrudAdapterResolver)
    protected readonly crudResolver: CrudResolverInterface,
  ) {}

  @CrudList()
  async list(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.crudResolver.list(ctx);
  }

  @CrudRead()
  async read(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.crudResolver.read(ctx);
  }

  @CrudCreateBatch({
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
    dto: CrudCreateBatchInterface<PhotoCreatableInterfaceFixture>,
  ) {
    return this.crudResolver.createBatch(ctx, dto);
  }

  @CrudCreate({ request: { body: photoCreateSchema } })
  async create(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
    @CrudBody({ schema: photoCreateSchema })
    dto: PhotoCreatableInterfaceFixture,
  ) {
    return this.crudResolver.create(ctx, dto);
  }

  @CrudUpdate({ request: { body: photoUpdateSchema } })
  async update(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
    @CrudBody({ schema: photoUpdateSchema })
    dto: PhotoUpdatableInterfaceFixture,
  ) {
    return this.crudResolver.update(ctx, dto);
  }

  @CrudReplace({ request: { body: photoUpdateSchema } })
  async replace(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
    @CrudBody({ schema: photoUpdateSchema })
    dto: PhotoUpdatableInterfaceFixture,
  ) {
    return this.crudResolver.replace(ctx, dto);
  }

  @CrudDelete()
  async delete(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.crudResolver.delete(ctx);
  }

  @CrudSoftDelete({ path: 'soft/:id' })
  async softDelete(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.crudResolver.softDelete(ctx);
  }

  @CrudRestore({ path: 'restore/:id' })
  async restore(
    @Ctx(CrudCtx)
    ctx: CrudContextInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.crudResolver.restore(ctx);
  }
}

// Use controller.class path to generate handlers from the decorated class
const crudBuilder = new ConfigurableCrudBuilder<PhotoEntityInterfaceFixture>({
  controller: {
    class: PhotoCcbCustomControllerFixture,
  },
});

export const PhotoCcbCustomProviders = crudBuilder.build().providers;
