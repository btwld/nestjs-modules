import { type PlainLiteralObject } from '@nestjs/common';
import { AggregateRoot } from '@nestjs/cqrs';

/**
 * Base class for every aggregate: an identity, its props, and domain events.
 *
 * Carries no persistence opinions. Extend `MutableAggregate` or
 * `AppendOnlyAggregate` for the common cases, or this class directly when
 * neither fits.
 */
export abstract class DomainAggregate<
  T extends PlainLiteralObject,
> extends AggregateRoot {
  readonly id: string;
  protected props: T;

  constructor(id: string, props: T) {
    super();
    this.id = id;
    this.props = { ...props };
  }

  toPlain() {
    return {
      id: this.id,
      ...this.props,
    };
  }
}
