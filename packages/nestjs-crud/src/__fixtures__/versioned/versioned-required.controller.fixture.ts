import { Operation } from '@concepta/nestjs-core';

import { ConfigurableCrudBuilder } from '../../infrastructure/utils/configurable-crud.builder.js';
import { CRUD_TEST_VERSIONED_REQUIRED_ENTITY_NAME } from '../crud-test.constants.js';

import { type VersionedEntityInterfaceFixture } from './interfaces/versioned-entity.interface.fixture.js';
import { versionedPaginatedSchema } from './schemas/versioned-paginated.schema.fixture.js';
import { versionedUpdateSchema } from './schemas/versioned-update.schema.fixture.js';
import { versionedSchema } from './schemas/versioned.schema.fixture.js';

/**
 * Same underlying table as `VersionedControllerFixture` (registered under a
 * second entity key — see `versioned.module.fixture.ts`), exercised through
 * a separate controller dedicated to `@CrudRequireVersion()` coverage:
 * `requireVersion: true` at the controller level (inherited by Update and
 * Delete), with Replace explicitly overriding it back to `false` at the
 * route level — proving the `MethodAndClass` lookup lets a route win over
 * its controller's default.
 */
const crudBuilder =
  new ConfigurableCrudBuilder<VersionedEntityInterfaceFixture>({
    controller: {
      path: 'versioned-required',
      entity: CRUD_TEST_VERSIONED_REQUIRED_ENTITY_NAME,
      request: { requireVersion: true },
      response: {
        resource: versionedSchema,
        paginated: versionedPaginatedSchema,
      },
    },
    operations: [
      { operation: Operation.Read },
      { operation: Operation.Update, request: { body: versionedUpdateSchema } },
      {
        operation: Operation.Replace,
        request: { body: versionedUpdateSchema, requireVersion: false },
      },
      { operation: Operation.Delete },
    ],
  });

const { controllers, providers } = crudBuilder.build();
const { VersionedRequiredController } = controllers;

export class VersionedRequiredControllerFixture extends VersionedRequiredController {}

export { providers as VersionedRequiredProviders };
