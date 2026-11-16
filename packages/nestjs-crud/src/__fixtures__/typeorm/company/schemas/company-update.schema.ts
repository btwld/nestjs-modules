import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

/**
 * Zod equivalent of the legacy `CompanyUpdateDto` — faithful reproduction,
 * `name` stays optional (a genuine partial-update field, not a
 * DTO/entity mismatch like `CompanyCreateDto.domain`).
 */
export const companyUpdateSchema = withOpenApi(
  z.object({
    name: z.string().max(100).optional(),
  }),
);
