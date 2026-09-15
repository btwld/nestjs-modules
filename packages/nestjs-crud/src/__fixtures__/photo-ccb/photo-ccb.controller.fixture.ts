import { Operation } from '@concepta/nestjs-core';

import { ConfigurableCrudBuilder } from '../../infrastructure/utils/configurable-crud.builder.js';
import { CRUD_TEST_PHOTO_CCB_ENTITY_NAME } from '../crud-test.constants.js';
import { type PhotoEntityInterfaceFixture } from '../photo/interfaces/photo-entity.interface.fixture.js';
import {
  photoCreateBatchResponseSchema,
  photoCreateBatchSchema,
} from '../photo/schemas/photo-create-batch.schema.fixture.js';
import { photoCreateSchema } from '../photo/schemas/photo-create.schema.fixture.js';
import { photoPaginatedSchema } from '../photo/schemas/photo-paginated.schema.fixture.js';
import { photoUpdateSchema } from '../photo/schemas/photo-update.schema.fixture.js';
import { photoSchema } from '../photo/schemas/photo.schema.fixture.js';

const crudBuilder = new ConfigurableCrudBuilder<PhotoEntityInterfaceFixture>({
  controller: {
    path: 'photo',
    entity: CRUD_TEST_PHOTO_CCB_ENTITY_NAME,
    request: { body: photoSchema },
    response: {
      resource: photoSchema,
      paginated: photoPaginatedSchema,
    },
  },
  operations: [
    { operation: Operation.List },
    { operation: Operation.Read },
    {
      operation: Operation.CreateBatch,
      request: { bodyBatch: photoCreateBatchSchema },
      response: {
        serialization: { resource: photoCreateBatchResponseSchema },
      },
    },
    {
      operation: Operation.Create,
      request: { body: photoCreateSchema },
    },
    {
      operation: Operation.Update,
      request: { body: photoUpdateSchema },
    },
    {
      operation: Operation.Replace,
      request: { body: photoUpdateSchema },
    },
    { operation: Operation.Delete },
    { operation: Operation.SoftDelete, path: 'soft/:id' },
    { operation: Operation.Restore, path: 'restore/:id' },
  ],
});

const { controllers, providers } = crudBuilder.build();
const { PhotoCcbController } = controllers;

export class PhotoCcbControllerFixture extends PhotoCcbController {}

export { providers as PhotoCcbProviders };
