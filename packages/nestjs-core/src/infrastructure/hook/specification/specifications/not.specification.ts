import { type PlainLiteralObject } from '@nestjs/common';

import { type SpecificationInterface } from '../../interfaces/specification.interface.js';
import { CompositeSpecification } from '../composite-specification.js';

/**
 * Negates a specification.
 * The result is true when the wrapped specification is not satisfied.
 */
export class NotSpecification<
  Ctx extends PlainLiteralObject = PlainLiteralObject,
> extends CompositeSpecification<Ctx> {
  constructor(private readonly spec: SpecificationInterface<Ctx>) {
    super();
  }

  isSatisfiedBy(context: Ctx): boolean {
    return !this.spec.isSatisfiedBy(context);
  }
}
