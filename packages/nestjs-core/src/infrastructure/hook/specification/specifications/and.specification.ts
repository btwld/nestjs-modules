import { type PlainLiteralObject } from '@nestjs/common';

import { type SpecificationInterface } from '../../interfaces/specification.interface.js';
import { CompositeSpecification } from '../composite-specification.js';

/**
 * Combines two specifications with AND logic.
 * Both specifications must be satisfied for the result to be true.
 */
export class AndSpecification<
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> extends CompositeSpecification<Ctx> {
  constructor(
    private readonly left: SpecificationInterface<Ctx>,
    private readonly right: SpecificationInterface<Ctx>,
  ) {
    super();
  }

  isSatisfiedBy(context: Ctx): boolean {
    return (
      this.left.isSatisfiedBy(context) && this.right.isSatisfiedBy(context)
    );
  }
}
