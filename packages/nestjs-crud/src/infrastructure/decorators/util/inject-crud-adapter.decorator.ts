import { Inject } from '@nestjs/common';

import { getDynamicAdapterToken } from '../../utils/crud-infra.utils.js';

/**
 * Decorator to inject a CRUD adapter by entity name
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class SomeService {
 *   constructor(
 *     @InjectCrudAdapter('User')
 *     protected readonly crudAdapter: CrudAdapter<UserEntity>,
 *   ) {}
 * }
 * ```
 *
 * @param name - The entity name used in the model configuration
 * @returns A parameter decorator for dependency injection
 */
export function InjectCrudAdapter(name: string) {
  return Inject(getDynamicAdapterToken(name));
}
