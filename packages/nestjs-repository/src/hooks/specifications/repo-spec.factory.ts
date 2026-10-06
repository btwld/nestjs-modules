import { type SpecificationInterface } from '@concepta/nestjs-core';

import { EntitySpecification } from './entity.specification.js';

/**
 * Factory for creating repository-specific specifications.
 *
 * @example
 * ```typescript
 * @RepoHook()
 * export class UserScopeHook {
 *   @BeforeFindOne(RepoSpec.isEntity('user-credentials'))
 *   scopeToUser(options, ctx) { ... }
 * }
 * ```
 */
export const RepoSpec = {
  /**
   * Matches when the repository entity matches the given name.
   */
  isEntity: (entityName: string): SpecificationInterface =>
    new EntitySpecification(entityName),
};
