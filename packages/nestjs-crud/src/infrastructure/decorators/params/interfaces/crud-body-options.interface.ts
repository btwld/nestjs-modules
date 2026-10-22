import { type z } from 'zod';

import { type PipeTransform, type Type } from '@nestjs/common';

import { type CrudBodyValidationOptionsInterface } from './crud-body-validation-options.interface.js';

export interface CrudBodyOptionsInterface {
  /**
   * Options merged into the `StandardSchemaValidationPipe` used to
   * validate `schema`. Overrides any controller/operation-level default.
   * `false` disables validation for the body (it is still bound, just
   * unvalidated).
   */
  validation?: CrudBodyValidationOptionsInterface | false;
  pipes?: (Type<PipeTransform> | PipeTransform)[];
  /**
   * The schema to validate the body against — consumed by
   * `crud-init-validation.decorator.ts` via
   * `Body({ schema, pipes: [new StandardSchemaValidationPipe(...)] })`.
   * When omitted, the body is still bound but never validated.
   */
  schema?: z.ZodType;
}
