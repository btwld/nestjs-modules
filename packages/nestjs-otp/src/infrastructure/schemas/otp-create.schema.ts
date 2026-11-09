import { z } from 'zod';

import { conformsTo } from '@concepta/nestjs-core';

import { type OtpCreatableInterface } from '../../domain/interfaces/otp-creatable.interface.js';

/**
 * `nestjs-otp` has no HTTP/swagger surface of its own (pure CQRS module),
 * so this schema is not wrapped with `withOpenApi`/`withNamedComponent` —
 * it's only ever consumed programmatically via `validateOtpSchema`.
 */
export const otpCreateSchema = conformsTo<OtpCreatableInterface>()(
  z.object({
    category: z.string(),
    type: z.string(),
    expiresIn: z.string(),
    rateSeconds: z.number().int().min(0).optional(),
    rateThreshold: z.number().int().min(1).optional(),
    assigneeId: z.string(),
  }),
);
