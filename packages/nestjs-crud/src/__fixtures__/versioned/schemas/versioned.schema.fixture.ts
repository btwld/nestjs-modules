import { z } from 'zod';

import {
  conformsTo,
  referenceIdSchema,
  withNamedComponent,
} from '@concepta/nestjs-core';

import { type VersionedEntityInterfaceFixture } from '../interfaces/versioned-entity.interface.fixture.js';

export const versionedSchema = withNamedComponent(
  conformsTo<VersionedEntityInterfaceFixture>()(
    referenceIdSchema.extend({
      name: z.string(),
      version: z.number(),
      dateDeleted: z.date().nullable(),
    }),
  ),
  'Versioned',
);
