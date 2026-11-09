import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type UserUpdatableInterface } from '../../domain/interfaces/user-updatable.interface.js';

/**
 * Used only as a request body — not a named OpenAPI component (no
 * `withNamedComponent`). No `id` field — the legacy `UserUpdateDto` required
 * `id` in the body (via `PickType(UserDto, ['id'])`), but
 * `update-user-request.handler.ts` reads `id` from the ROUTE PARAM
 * (`context.params.id`), never from `dto.id`; `UserUpdatableInterface`
 * doesn't declare `id` either. Dropping it matches actual behavior — the
 * route param stays authoritative — and isn't a behavior change since
 * nothing sends or needs `id` in the body today (no e2e ever exercised it).
 *
 * `email` carries `.email()` (matching legacy `@IsEmail()`, inherited via
 * `UserUpdateDto`'s `PickType(UserDto, ['email', ...])`) — see
 * `user.schema.ts` for why the response schema doesn't share this check.
 */
export const userUpdateSchema = withOpenApi(
  conformsTo<UserUpdatableInterface>()(
    z.object({
      email: z.string().email().optional().meta({ description: 'Email' }),
      active: z.boolean().optional().meta({ description: 'Active' }),
    }),
  ),
);
