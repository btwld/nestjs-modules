import { z } from 'zod';

/**
 * Zod equivalent of the legacy `TestModelUpdateDto` — faithful
 * reproduction. `id` is required (the legacy DTO had no `@IsOptional()`
 * on it, unlike every other field).
 */
export const testModelUpdateSchema = z.object({
  id: z.number(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.email().optional(),
  age: z.number().optional(),
});
