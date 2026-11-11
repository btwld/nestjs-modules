import { type PlainLiteralObject } from '@nestjs/common';

import { type CrudRequestInterface } from './crud-request.interface.js';

/**
 * Decides whether a CRUD request may run, before its resolver dispatches it.
 * Refuses by throwing; what it refuses for is the implementer's.
 *
 * Asked by every built-in resolver, for every operation, however the
 * controller was built. A custom resolver asks it the same way, or nothing
 * does.
 */
export interface CrudRequestPolicyInterface {
  check<Entity extends PlainLiteralObject>(
    request: CrudRequestInterface<Entity>,
  ): void | Promise<void>;
}
