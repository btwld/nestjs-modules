import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type PhotoUpdatableInterfaceFixture } from '../interfaces/photo-updatable.interface.fixture.js';

import { photoSchema } from './photo.schema.fixture.js';

/**
 * All fields are REQUIRED here — the original `PhotoUpdateDtoFixture` used
 * `PickType` (not `PartialType`) despite being an "update" DTO, so no field
 * was actually optional. Reproduced faithfully.
 */
export const photoUpdateSchema = withOpenApi(
  conformsTo<PhotoUpdatableInterfaceFixture>()(
    photoSchema.pick({
      name: true,
      description: true,
      filename: true,
      isPublished: true,
      views: true,
    }),
  ),
);
