import { z } from 'zod';

import { conformsTo, withNamedComponent } from '@concepta/nestjs-core';
import { domainAggregateSchema } from '@concepta/nestjs-core/aggregate';

import { type UserInterface } from '../../domain/interfaces/user.interface.js';

/**
 * `email` is intentionally a plain `z.string()` here (no `.email()` format
 * check) — legacy `UserDto.email` carried `@IsEmail()`, but response
 * serialization (`instanceToPlain`) never ran class-validator, only
 * `ValidationPipe` (input) did. So today GET responses never validate email
 * format, only writes do. Format validation lives on `userCreateSchema`/
 * `userUpdateSchema` instead — see those files. Adding `.email()` here would
 * introduce a new fail-closed 500 on read for any already-persisted,
 * legacy-malformed email that doesn't exist today.
 */
export const userSchema = withNamedComponent(
  conformsTo<UserInterface>()(
    domainAggregateSchema.extend({
      email: z.string().meta({ description: 'Email' }),
      username: z.string().meta({ description: 'Username' }),
      active: z.boolean().meta({ description: 'Active' }),
    }),
  ),
  'User',
);
