import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type RoleCreatableInterface } from '../../domain/interfaces/role-creatable.interface.js';

/**
 * Used only as a request body — not a named OpenAPI component (no
 * `withNamedComponent`). `name` is required and rejects a blank or
 * whitespace-only value (`.trim().min(1)`) — the legacy `RoleDto` had no
 * `@IsNotEmpty()` on `name`, but that gap was never actually reachable: with
 * `excludeExtraneousValues: true`, class-transformer left an omitted `name`
 * as `undefined` (not the property-initializer default), which
 * `@IsString()` (no `@IsOptional()`) rejected with a 400. `description`
 * keeps `.default('')`, matching the legacy `@IsOptional()` on that field.
 */
export const roleCreateSchema = withOpenApi(
  conformsTo<RoleCreatableInterface>()(
    z.object({
      name: z.string().trim().min(1).meta({ description: 'Name of the role' }),
      description: z
        .string()
        .default('')
        .meta({ description: 'Description of the role' }),
    }),
  ),
);
