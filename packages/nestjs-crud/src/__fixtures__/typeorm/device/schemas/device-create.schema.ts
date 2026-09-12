import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

/**
 * Zod equivalent of the legacy `DeviceCreateDto` — `deviceKey` stays
 * optional (faithful reproduction, and NOT a bug per the Phase 3 plan
 * decision): `DeviceEntity.deviceKey` is a `@PrimaryGeneratedColumn('uuid')`,
 * normally server-generated, so client-optional is correct.
 */
export const deviceCreateSchema = withOpenApi(
  z.object({
    deviceKey: z.uuid().optional(),
    description: z.string().optional(),
  }),
);
