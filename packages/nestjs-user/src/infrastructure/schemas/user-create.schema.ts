import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type UserCreatableInterface } from '../../domain/interfaces/user-creatable.interface.js';

/**
 * Used only as a request body — not a named OpenAPI component (no
 * `withNamedComponent`). Authored fresh (not `.pick()`-derived from
 * `userSchema`) because `email` here carries `.email()` format validation,
 * matching the legacy `@IsEmail()` on `UserCreateDto` — see `user.schema.ts`
 * for why the response schema deliberately does NOT share this check.
 *
 * `password` (plaintext, optional) — NOT `passwordHash` — matching
 * `UserCreatableInterface`'s actual `Partial<PasswordPlainInterface>` and
 * what `CreateUserHandler` actually reads (`dto.password`). The legacy
 * `UserCreateDto` mistakenly exposed `passwordHash` instead, which combined
 * with `excludeAll`+`excludeExtraneousValues:true` silently stripped any
 * `password` an HTTP client sent — user creation via the CRUD endpoint never
 * actually set a password. Verified safe to fix: no code path anywhere
 * (seeding, federated provisioning, internal commands) ever supplies
 * `passwordHash` as external input — it's always computed internally via
 * `UserPasswordPort.create()`.
 */
export const userCreateSchema = withOpenApi(
  conformsTo<UserCreatableInterface>()(
    z.object({
      username: z.string().meta({ description: 'Username' }),
      email: z.string().email().meta({ description: 'Email' }),
      active: z.boolean().optional().meta({ description: 'Active' }),
      password: z
        .string()
        .min(8)
        .optional()
        .meta({ description: 'Plain text password to set' }),
    }),
  ),
);
