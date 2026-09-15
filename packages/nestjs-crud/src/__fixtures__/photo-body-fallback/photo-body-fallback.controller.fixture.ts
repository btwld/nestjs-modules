import { Operation } from '@concepta/nestjs-core';

import { ConfigurableCrudBuilder } from '../../infrastructure/utils/configurable-crud.builder.js';
import { CRUD_TEST_PHOTO_BODY_FALLBACK_ENTITY_NAME } from '../crud-test.constants.js';
import { type PhotoEntityInterfaceFixture } from '../photo/interfaces/photo-entity.interface.fixture.js';
import { photoPaginatedSchema } from '../photo/schemas/photo-paginated.schema.fixture.js';
import { photoSchema } from '../photo/schemas/photo.schema.fixture.js';

/**
 * Mirrors #467's reporter config exactly: `request.body` declared ONLY at
 * controller level (`photoSchema`, a `withNamedComponent` schema), and the
 * `Create` operation has NO op-level override — regression fixture for both
 * the docs `$ref` fix and the docs/validation resolution convergence.
 */
const crudBuilder = new ConfigurableCrudBuilder<PhotoEntityInterfaceFixture>({
  controller: {
    path: 'photo-body-fallback',
    entity: CRUD_TEST_PHOTO_BODY_FALLBACK_ENTITY_NAME,
    request: { body: photoSchema },
    response: {
      resource: photoSchema,
      paginated: photoPaginatedSchema,
    },
  },
  operations: [{ operation: Operation.Create }],
});

const { controllers, providers } = crudBuilder.build();
const { PhotoBodyFallbackController } = controllers;

export class PhotoBodyFallbackControllerFixture extends PhotoBodyFallbackController {}

export { providers as PhotoBodyFallbackProviders };
