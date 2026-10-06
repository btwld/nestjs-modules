import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type PhotoCreatableInterfaceFixture } from '../interfaces/photo-creatable.interface.fixture.js';

import { photoSchema } from './photo.schema.fixture.js';

export const photoCreateSchema = withOpenApi(
  conformsTo<PhotoCreatableInterfaceFixture>()(
    photoSchema.pick({
      name: true,
      description: true,
      filename: true,
      isPublished: true,
    }),
  ),
);
