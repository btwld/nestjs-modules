import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type VersionedCreatableInterfaceFixture } from '../interfaces/versioned-creatable.interface.fixture.js';

import { versionedSchema } from './versioned.schema.fixture.js';

export const versionedCreateSchema = withOpenApi(
  conformsTo<VersionedCreatableInterfaceFixture>()(
    versionedSchema.pick({ name: true }),
  ),
);
