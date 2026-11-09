import { z } from 'zod';

import { withOpenApi } from '@concepta/nestjs-core';

import { type CompanyType } from '../../company/schemas/company.schema.js';
import { companySchema } from '../../company/schemas/company.schema.js';
import { userProfileSchema } from '../../user-profile/schemas/user-profile.schema.js';

/**
 * Explicit shape, not `z.infer`-derived — `User`/`Company` are mutually
 * nested (`user.company` ↔ `company.users`, a genuine circular reference
 * with `company.schema.ts`), so each side's schema needs an explicit type
 * annotation to break TypeScript's circular inference (`z.lazy()` alone
 * only defers the RUNTIME reference, not the type).
 */
export interface UserType {
  id?: number;
  email: string;
  isActive: boolean;
  companyId?: number;
  deletedAt?: Date | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: CompanyType;
  userProfile?: z.infer<typeof userProfileSchema>;
}

/**
 * Zod equivalent of the legacy `UserDto` — no domain interface exists for
 * these TypeORM test fixtures, so there is no `conformsTo` to apply.
 * `company` is wrapped in `z.lazy()` because of the circular reference
 * described above. `deletedAt` is `.nullable()` (not just `.optional()`
 * like the legacy DTO's plain `@Expose() deletedAt?: Date`) because
 * `@DeleteDateColumn` always returns the key as `null`, never omits it,
 * when a row isn't soft-deleted — the legacy class-transformer path never
 * validated this on the way out, but the schema-based serializer does
 * (fail-closed), so this must reflect real persisted data.
 */
export const userSchema: z.ZodType<UserType> = withOpenApi(
  z.object({
    id: z.number().optional(),
    email: z.string(),
    isActive: z.boolean(),
    companyId: z.number().optional(),
    deletedAt: z.date().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    company: z.lazy(() => companySchema).optional(),
    userProfile: userProfileSchema.optional(),
  }),
);
