import { applyDecorators } from '@nestjs/common';

import { CrudInitApiBody } from './crud-init-api-body.decorator.js';
import { CrudInitApiParams } from './crud-init-api-params.decorator.js';
import { CrudInitApiQuery } from './crud-init-api-query.decorator.js';
import { CrudInitApiResponse } from './crud-init-api-response.decorator.js';
import { CrudInitCommand } from './crud-init-command.decorator.js';
import { CrudInitQuery } from './crud-init-query.decorator.js';
import { CrudInitSerialization } from './crud-init-serialization.decorator.js';
import { CrudInitValidation } from './crud-init-validation.decorator.js';

/**
 * CRUD controller initialization decorator.
 *
 * Runs all init decorators that resolve metadata and apply NestJS decorators.
 * Can be re-run safely after metadata changes (e.g., by ConfigurableCrudBuilder).
 */
export const CrudInit = () =>
  applyDecorators(
    CrudInitValidation(),
    CrudInitSerialization(),
    CrudInitQuery(),
    CrudInitCommand(),
    CrudInitApiBody(),
    CrudInitApiQuery(),
    CrudInitApiParams(),
    CrudInitApiResponse(),
  );
