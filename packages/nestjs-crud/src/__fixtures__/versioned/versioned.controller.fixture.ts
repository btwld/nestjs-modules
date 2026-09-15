import { Operation } from '@concepta/nestjs-core';

import { ConfigurableCrudBuilder } from '../../infrastructure/utils/configurable-crud.builder.js';
import { CRUD_TEST_VERSIONED_ENTITY_NAME } from '../crud-test.constants.js';

import { type VersionedEntityInterfaceFixture } from './interfaces/versioned-entity.interface.fixture.js';
import { versionedCreateSchema } from './schemas/versioned-create.schema.fixture.js';
import { versionedPaginatedSchema } from './schemas/versioned-paginated.schema.fixture.js';
import { versionedUpdateSchema } from './schemas/versioned-update.schema.fixture.js';
import { versionedSchema } from './schemas/versioned.schema.fixture.js';

/**
 * Full CRUD surface, no `@CrudRequireVersion()` anywhere — the default,
 * optional-`If-Match` behavior. Used for the #472 A/B lost-update timeline,
 * `ETag` emission/suppression, and the plain 409-on-mismatch tests.
 */
const crudBuilder =
  new ConfigurableCrudBuilder<VersionedEntityInterfaceFixture>({
    controller: {
      path: 'versioned',
      entity: CRUD_TEST_VERSIONED_ENTITY_NAME,
      response: {
        resource: versionedSchema,
        paginated: versionedPaginatedSchema,
      },
    },
    operations: [
      { operation: Operation.List },
      { operation: Operation.Read },
      { operation: Operation.Create, request: { body: versionedCreateSchema } },
      { operation: Operation.Update, request: { body: versionedUpdateSchema } },
      {
        operation: Operation.Replace,
        request: { body: versionedUpdateSchema },
      },
      { operation: Operation.Delete },
      { operation: Operation.SoftDelete, path: 'soft/:id' },
      { operation: Operation.Restore, path: 'restore/:id' },
    ],
  });

const { controllers, providers } = crudBuilder.build();
const { VersionedController } = controllers;

export class VersionedControllerFixture extends VersionedController {}

export { providers as VersionedProviders };
