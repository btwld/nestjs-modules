import { Inject } from '@nestjs/common';

import { CrudBaseController } from '../../crud/controllers/crud-base.controller';
import { CrudBody } from '../../crud/decorators/params/crud-body.decorator';
import { CrudRequest } from '../../crud/decorators/params/crud-request.decorator';
import { CrudSoftDelete } from '../../crud/decorators/routes/crud-soft-delete.decorator';
import { CrudRequestInterface } from '../../crud/interfaces/crud-request.interface';
import { CrudService } from '../../services/crud.service';
import { ConfigurableCrudBuilder } from '../../util/configurable-crud.builder';
import { PhotoCreateManyDtoFixture } from '../photo/dto/photo-create-many.dto.fixture';
import { PhotoCreateDtoFixture } from '../photo/dto/photo-create.dto.fixture';
import { PhotoPaginatedDtoFixture } from '../photo/dto/photo-paginated.dto.fixture';
import { PhotoUpdateDtoFixture } from '../photo/dto/photo-update.dto.fixture';
import { PhotoDtoFixture } from '../photo/dto/photo.dto.fixture';
import { PhotoCreatableInterfaceFixture } from '../photo/interfaces/photo-creatable.interface.fixture';
import { PhotoEntityInterfaceFixture } from '../photo/interfaces/photo-entity.interface.fixture';
import { PhotoUpdatableInterfaceFixture } from '../photo/interfaces/photo-updatable.interface.fixture';
import { PhotoTypeOrmCrudAdapterFixture } from '../photo/photo-typeorm-crud.adapter.fixture';

export const PHOTO_CRUD_SERVICE_TOKEN = Symbol('__PHOTO_CRUD_SERVICE_TOKEN__');

const crudBuilder = new ConfigurableCrudBuilder<
  PhotoEntityInterfaceFixture,
  PhotoCreatableInterfaceFixture,
  PhotoUpdatableInterfaceFixture
>({
  service: {
    adapter: PhotoTypeOrmCrudAdapterFixture,
    injectionToken: PHOTO_CRUD_SERVICE_TOKEN,
  },
  controller: {
    path: 'photo',
    model: {
      type: PhotoDtoFixture,
      paginatedType: PhotoPaginatedDtoFixture,
    },
  },
  getMany: {},
  getOne: {},
  createMany: {
    dto: PhotoCreateManyDtoFixture,
  },
  createOne: {
    dto: PhotoCreateDtoFixture,
  },
  updateOne: {
    dto: PhotoUpdateDtoFixture,
  },
  replaceOne: {
    dto: PhotoUpdateDtoFixture,
  },
  deleteOne: {
    extraDecorators: [CrudSoftDelete(true)],
  },
  recoverOne: { path: 'recover/:id' },
});

const {
  ConfigurableServiceClass,
  CrudController,
  CrudGetMany,
  CrudGetOne,
  CrudCreateMany,
  CrudCreateOne,
  CrudUpdateOne,
  CrudReplaceOne,
  CrudDeleteOne,
  CrudRecoverOne,
} = crudBuilder.build();

export class PhotoCcbCustomCrudServiceFixture extends ConfigurableServiceClass {}

@CrudController
export class PhotoCcbCustomControllerFixture extends CrudBaseController<
  PhotoEntityInterfaceFixture,
  PhotoCreatableInterfaceFixture,
  PhotoUpdatableInterfaceFixture
> {
  constructor(
    @Inject(PHOTO_CRUD_SERVICE_TOKEN)
    protected crudService: CrudService<PhotoEntityInterfaceFixture>,
  ) {
    super(crudService);
  }

  @CrudGetMany
  async getMany(@CrudRequest() crudRequest: CrudRequestInterface) {
    return this.crudService.getMany(crudRequest);
  }

  @CrudGetOne
  async getOne(@CrudRequest() crudRequest: CrudRequestInterface) {
    return this.crudService.getOne(crudRequest);
  }

  @CrudCreateMany
  async createMany(
    @CrudRequest() crudRequest: CrudRequestInterface,
    @CrudBody() dto: PhotoCreateManyDtoFixture,
  ) {
    return this.crudService.createMany(crudRequest, dto);
  }

  @CrudCreateOne
  async createOne(
    @CrudRequest() crudRequest: CrudRequestInterface,
    @CrudBody() dto: PhotoCreateDtoFixture,
  ) {
    return this.crudService.createOne(crudRequest, dto);
  }

  @CrudUpdateOne
  async updateOne(
    @CrudRequest() crudRequest: CrudRequestInterface,
    @CrudBody() dto: PhotoUpdateDtoFixture,
  ) {
    return this.crudService.updateOne(crudRequest, dto);
  }

  @CrudReplaceOne
  async replaceOne(
    @CrudRequest() crudRequest: CrudRequestInterface,
    @CrudBody() dto: PhotoUpdateDtoFixture,
  ) {
    return this.crudService.replaceOne(crudRequest, dto);
  }

  @CrudDeleteOne
  async deleteOne(@CrudRequest() crudRequest: CrudRequestInterface) {
    return this.crudService.deleteOne(crudRequest);
  }

  @CrudRecoverOne
  async recoverOne(@CrudRequest() crudRequest: CrudRequestInterface) {
    return this.crudService.recoverOne(crudRequest);
  }
}
