import { type PlainLiteralObject } from '@nestjs/common';

import { type DomainAggregate } from './domain-aggregate.js';

export abstract class DomainMapper<
  Entity,
  A extends DomainAggregate<PlainLiteralObject>,
> {
  abstract createAggregate(entity: Entity): A;

  toDomain(entity: Entity): A {
    return this.createAggregate(entity);
  }

  /**
   * Convert an aggregate to the row its repository stores.
   *
   * Required because the stored row may differ from the aggregate's props —
   * a value object held in props may be stored as several columns. When the
   * shapes match, return `aggregate.toPlain()`.
   *
   * Translate here rather than relying on the repository to notice: `upsert`
   * accepts a partial row, so a props-shaped object with an untranslated
   * value compiles there.
   */
  abstract toPersistence(aggregate: A): Entity;
}
