import { CrudSoftDelete } from '../../crud/decorators/routes/crud-soft-delete.decorator';
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

export const PHOTO_CRUD_ADAPTER_TOKEN = Symbol('__PHOTO_CRUD_ADAPTER_TOKEN__');

const crudBuilder = new ConfigurableCrudBuilder<
  PhotoEntityInterfaceFixture,
  PhotoCreatableInterfaceFixture,
  PhotoUpdatableInterfaceFixture
>({
  service: {
    adapter: PhotoTypeOrmCrudAdapterFixture,
    injectionToken: PHOTO_CRUD_ADAPTER_TOKEN,
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

const { ConfigurableControllerClass, ConfigurableServiceClass } =
  crudBuilder.build();

export class PhotoCcbCrudServiceFixture extends ConfigurableServiceClass {}
export class PhotoCcbControllerFixture extends ConfigurableControllerClass {}
