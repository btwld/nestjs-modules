import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type VersionedUpdatableInterfaceFixture } from '../interfaces/versioned-updatable.interface.fixture.js';

import { versionedSchema } from './versioned.schema.fixture.js';

export const versionedUpdateSchema = withOpenApi(
  conformsTo<VersionedUpdatableInterfaceFixture>()(
    versionedSchema.pick({ name: true }),
  ),
);
