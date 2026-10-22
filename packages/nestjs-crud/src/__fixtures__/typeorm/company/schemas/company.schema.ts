import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

import { type UserType } from '../../users/schemas/user.schema.js';
import { userSchema } from '../../users/schemas/user.schema.js';

/**
 * Explicit shape, not `z.infer`-derived — `Company`/`User` are mutually
 * nested (`company.users` ↔ `user.company`, a genuine circular reference
 * between this file and `user.schema.ts`), so each side's schema needs an
 * explicit type annotation to break TypeScript's circular inference
 * (`z.lazy()` alone only defers the RUNTIME reference, not the type).
 */
export interface CompanyType {
  id?: number;
  name: string;
  domain: string;
  description: string | null;
  users?: UserType[];
}

/**
 * Zod equivalent of the legacy `CompanyDto` — no domain interface exists
 * for these TypeORM test fixtures, so there is no `conformsTo` to apply.
 * `users` is wrapped in `z.lazy()` because of the circular reference
 * described above. `description` is `.nullable()` (not just typed
 * `string` like the legacy DTO) because `CompanyEntity.description` is
 * `nullable: true, default: null` and the seed fixtures never set it —
 * the legacy class-transformer path never actually validated this on the
 * way out, but the schema-based serializer does (fail-closed), so this
 * must reflect real persisted data, not just the DTO's declared type.
 */
export const companySchema: z.ZodType<CompanyType> = withOpenApi(
  z.object({
    id: z.number().optional(),
    name: z.string(),
    domain: z.string(),
    description: z.string().nullable(),
    users: z.array(z.lazy(() => userSchema)).optional(),
  }),
);
