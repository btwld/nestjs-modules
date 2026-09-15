import { type SpecificationInterface } from '@concepta/nestjs-core';

/**
 * Specification that matches when the context's entity key
 * equals the target entity key.
 *
 * Used with repository hook method decorators to scope hooks
 * to specific entities.
 *
 * @example
 * ```typescript
 * @BeforeFindOne(RepoSpec.isEntity('user-credentials'))
 * scopeToUser(options, ctx) { ... }
 * ```
 */
export class EntitySpecification implements SpecificationInterface {
  constructor(private readonly entity: string) {}

  isSatisfiedBy(context: { entity?: string }): boolean {
    return context.entity === this.entity;
  }
}
