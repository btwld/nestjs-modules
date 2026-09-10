import { type PlainLiteralObject } from '@nestjs/common';

import { type SpecificationInterface } from '../../interfaces/specification.interface.js';
import { Spec } from '../spec.factory.js';
import { AndSpecification } from '../specifications/and.specification.js';
import { NotSpecification } from '../specifications/not.specification.js';
import { OrSpecification } from '../specifications/or.specification.js';

/**
 * Simple specification that checks if a value is greater than a threshold.
 */
class GreaterThanSpec implements SpecificationInterface<{ value: number }> {
  constructor(private readonly threshold: number) {}

  isSatisfiedBy(context: { value: number }): boolean {
    return context.value > this.threshold;
  }
}

/**
 * Simple specification that checks if a value is even.
 */
class IsEvenSpec implements SpecificationInterface<{ value: number }> {
  isSatisfiedBy(context: { value: number }): boolean {
    return context.value % 2 === 0;
  }
}

/**
 * Specification that always returns true.
 */
class AlwaysTrueSpec implements SpecificationInterface<PlainLiteralObject> {
  isSatisfiedBy(): boolean {
    return true;
  }
}

/**
 * Specification that always returns false.
 */
class AlwaysFalseSpec implements SpecificationInterface<PlainLiteralObject> {
  isSatisfiedBy(): boolean {
    return false;
  }
}

describe('Spec factory', () => {
  describe('Spec.always()', () => {
    it('should always return true', () => {
      const spec = Spec.always();
      expect(spec.isSatisfiedBy({})).toBe(true);
      expect(spec.isSatisfiedBy({ any: 'value' })).toBe(true);
    });
  });

  describe('Spec.never()', () => {
    it('should always return false', () => {
      const spec = Spec.never();
      expect(spec.isSatisfiedBy({})).toBe(false);
      expect(spec.isSatisfiedBy({ any: 'value' })).toBe(false);
    });
  });

  describe('Spec.and()', () => {
    it('should combine specs with AND logic', () => {
      const greaterThan5 = new GreaterThanSpec(5);
      const isEven = new IsEvenSpec();
      const combined = Spec.and(greaterThan5, isEven);

      // 10 > 5 AND 10 is even = true
      expect(combined.isSatisfiedBy({ value: 10 })).toBe(true);

      // 8 > 5 AND 8 is even = true
      expect(combined.isSatisfiedBy({ value: 8 })).toBe(true);

      // 7 > 5 AND 7 is even = false (7 is odd)
      expect(combined.isSatisfiedBy({ value: 7 })).toBe(false);

      // 4 > 5 AND 4 is even = false (4 is not > 5)
      expect(combined.isSatisfiedBy({ value: 4 })).toBe(false);

      // 3 > 5 AND 3 is even = false (both fail)
      expect(combined.isSatisfiedBy({ value: 3 })).toBe(false);
    });

    it('should return an AndSpecification instance', () => {
      const spec1 = new AlwaysTrueSpec();
      const spec2 = new AlwaysFalseSpec();
      const combined = Spec.and(spec1, spec2);

      expect(combined).toBeInstanceOf(AndSpecification);
    });

    it('should short-circuit on first false', () => {
      const alwaysFalse = new AlwaysFalseSpec();
      const alwaysTrue = new AlwaysTrueSpec();
      const combined = Spec.and(alwaysFalse, alwaysTrue);

      expect(combined.isSatisfiedBy({})).toBe(false);
    });
  });

  describe('Spec.or()', () => {
    it('should combine specs with OR logic', () => {
      const greaterThan5 = new GreaterThanSpec(5);
      const isEven = new IsEvenSpec();
      const combined = Spec.or(greaterThan5, isEven);

      // 10 > 5 OR 10 is even = true (both true)
      expect(combined.isSatisfiedBy({ value: 10 })).toBe(true);

      // 7 > 5 OR 7 is even = true (first true)
      expect(combined.isSatisfiedBy({ value: 7 })).toBe(true);

      // 4 > 5 OR 4 is even = true (second true)
      expect(combined.isSatisfiedBy({ value: 4 })).toBe(true);

      // 3 > 5 OR 3 is even = false (both false)
      expect(combined.isSatisfiedBy({ value: 3 })).toBe(false);
    });

    it('should return an OrSpecification instance', () => {
      const spec1 = new AlwaysTrueSpec();
      const spec2 = new AlwaysFalseSpec();
      const combined = Spec.or(spec1, spec2);

      expect(combined).toBeInstanceOf(OrSpecification);
    });
  });

  describe('Spec.not()', () => {
    it('should negate a specification', () => {
      const greaterThan5 = new GreaterThanSpec(5);
      const notGreaterThan5 = Spec.not(greaterThan5);

      expect(notGreaterThan5.isSatisfiedBy({ value: 10 })).toBe(false);
      expect(notGreaterThan5.isSatisfiedBy({ value: 5 })).toBe(true);
      expect(notGreaterThan5.isSatisfiedBy({ value: 3 })).toBe(true);
    });

    it('should return a NotSpecification instance', () => {
      const spec = new AlwaysTrueSpec();
      const negated = Spec.not(spec);

      expect(negated).toBeInstanceOf(NotSpecification);
    });

    it('should double negate back to original', () => {
      const spec = new GreaterThanSpec(5);
      const doubleNegated = Spec.not(Spec.not(spec));

      // Double negation should give same results
      expect(doubleNegated.isSatisfiedBy({ value: 10 })).toBe(true);
      expect(doubleNegated.isSatisfiedBy({ value: 3 })).toBe(false);
    });
  });

  describe('complex compositions', () => {
    it('should handle chained compositions', () => {
      const greaterThan5 = new GreaterThanSpec(5);
      const lessThan20 = Spec.not(new GreaterThanSpec(20)); // <= 20
      const isEven = new IsEvenSpec();

      // (value > 5) AND (value <= 20) AND (value is even)
      const combined = Spec.and(Spec.and(greaterThan5, lessThan20), isEven);

      expect(combined.isSatisfiedBy({ value: 10 })).toBe(true); // 10 > 5, 10 <= 20, even
      expect(combined.isSatisfiedBy({ value: 8 })).toBe(true); // 8 > 5, 8 <= 20, even
      expect(combined.isSatisfiedBy({ value: 7 })).toBe(false); // odd
      expect(combined.isSatisfiedBy({ value: 4 })).toBe(false); // not > 5
      expect(combined.isSatisfiedBy({ value: 22 })).toBe(false); // > 20
    });

    it('should handle mixed and/or compositions', () => {
      const greaterThan10 = new GreaterThanSpec(10);
      const isEven = new IsEvenSpec();

      // (value > 10) OR (value is even)
      const orCombined = Spec.or(greaterThan10, isEven);

      expect(orCombined.isSatisfiedBy({ value: 15 })).toBe(true); // > 10
      expect(orCombined.isSatisfiedBy({ value: 4 })).toBe(true); // even
      expect(orCombined.isSatisfiedBy({ value: 5 })).toBe(false); // neither

      // NOT ((value > 10) OR (value is even))
      const notOrCombined = Spec.not(orCombined);

      expect(notOrCombined.isSatisfiedBy({ value: 15 })).toBe(false);
      expect(notOrCombined.isSatisfiedBy({ value: 4 })).toBe(false);
      expect(notOrCombined.isSatisfiedBy({ value: 5 })).toBe(true);
    });
  });
});

describe('AndSpecification', () => {
  it('should return true only when both specs are satisfied', () => {
    const left = new AlwaysTrueSpec();
    const right = new AlwaysTrueSpec();
    const and = new AndSpecification(left, right);

    expect(and.isSatisfiedBy({})).toBe(true);
  });

  it('should return false when left spec is not satisfied', () => {
    const left = new AlwaysFalseSpec();
    const right = new AlwaysTrueSpec();
    const and = new AndSpecification(left, right);

    expect(and.isSatisfiedBy({})).toBe(false);
  });

  it('should return false when right spec is not satisfied', () => {
    const left = new AlwaysTrueSpec();
    const right = new AlwaysFalseSpec();
    const and = new AndSpecification(left, right);

    expect(and.isSatisfiedBy({})).toBe(false);
  });

  it('should return false when both specs are not satisfied', () => {
    const left = new AlwaysFalseSpec();
    const right = new AlwaysFalseSpec();
    const and = new AndSpecification(left, right);

    expect(and.isSatisfiedBy({})).toBe(false);
  });
});

describe('OrSpecification', () => {
  it('should return true when both specs are satisfied', () => {
    const left = new AlwaysTrueSpec();
    const right = new AlwaysTrueSpec();
    const or = new OrSpecification(left, right);

    expect(or.isSatisfiedBy({})).toBe(true);
  });

  it('should return true when left spec is satisfied', () => {
    const left = new AlwaysTrueSpec();
    const right = new AlwaysFalseSpec();
    const or = new OrSpecification(left, right);

    expect(or.isSatisfiedBy({})).toBe(true);
  });

  it('should return true when right spec is satisfied', () => {
    const left = new AlwaysFalseSpec();
    const right = new AlwaysTrueSpec();
    const or = new OrSpecification(left, right);

    expect(or.isSatisfiedBy({})).toBe(true);
  });

  it('should return false when neither spec is satisfied', () => {
    const left = new AlwaysFalseSpec();
    const right = new AlwaysFalseSpec();
    const or = new OrSpecification(left, right);

    expect(or.isSatisfiedBy({})).toBe(false);
  });
});

describe('NotSpecification', () => {
  it('should negate true to false', () => {
    const spec = new AlwaysTrueSpec();
    const not = new NotSpecification(spec);

    expect(not.isSatisfiedBy({})).toBe(false);
  });

  it('should negate false to true', () => {
    const spec = new AlwaysFalseSpec();
    const not = new NotSpecification(spec);

    expect(not.isSatisfiedBy({})).toBe(true);
  });
});
