import { CrudSoftDelete } from '../../crud/decorators/routes/crud-soft-delete.decorator';
import { CrudCreateManyInterface } from '../../crud/interfaces/crud-create-many.interface';
import { CrudRequestInterface } from '../../crud/interfaces/crud-request.interface';
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
  ConfigurableControllerClass,
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

export class PhotoCcbSubCrudServiceFixture extends ConfigurableServiceClass {}

@CrudController
export class PhotoCcbSubControllerFixture extends ConfigurableControllerClass {
  @CrudGetMany
  async getMany(crudRequest: CrudRequestInterface) {
    return super.getMany(crudRequest);
  }

  @CrudGetOne
  async getOne(crudRequest: CrudRequestInterface) {
    return super.getOne(crudRequest);
  }

  @CrudCreateMany
  async createMany(
    crudRequest: CrudRequestInterface,
    dto: CrudCreateManyInterface<PhotoCreatableInterfaceFixture>,
  ) {
    return super.createMany(crudRequest, dto);
  }

  @CrudCreateOne
  async createOne(
    crudRequest: CrudRequestInterface,
    dto: PhotoCreatableInterfaceFixture,
  ) {
    return super.createOne(crudRequest, dto);
  }

  @CrudUpdateOne
  async updateOne(
    crudRequest: CrudRequestInterface,
    dto: PhotoUpdatableInterfaceFixture,
  ) {
    return super.updateOne(crudRequest, dto);
  }

  @CrudReplaceOne
  async replaceOne(
    crudRequest: CrudRequestInterface,
    dto: PhotoUpdatableInterfaceFixture,
  ) {
    return super.replaceOne(crudRequest, dto);
  }

  @CrudDeleteOne
  async deleteOne(crudRequest: CrudRequestInterface) {
    return super.deleteOne(crudRequest);
  }

  @CrudRecoverOne
  async recoverOne(crudRequest: CrudRequestInterface) {
    return super.recoverOne(crudRequest);
  }
}
