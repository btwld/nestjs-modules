import { z } from 'zod';

/**
 * Zod equivalent of the legacy `TestModelCreateDto` — faithful
 * reproduction, all four fields required.
 */
export const testModelCreateSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  age: z.number(),
});
