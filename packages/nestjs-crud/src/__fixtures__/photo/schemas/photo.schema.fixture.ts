import { z } from 'zod';

import {
  conformsTo,
  referenceIdSchema,
  withNamedComponent,
} from '@concepta/nestjs-core';

import { type PhotoEntityInterfaceFixture } from '../interfaces/photo-entity.interface.fixture.js';

export const photoSchema = withNamedComponent(
  conformsTo<PhotoEntityInterfaceFixture>()(
    referenceIdSchema.extend({
      name: z.string(),
      description: z.string(),
      filename: z.string(),
      views: z.number(),
      isPublished: z.boolean(),
      deletedAt: z.date().nullable(),
    }),
  ),
  'Photo',
);
