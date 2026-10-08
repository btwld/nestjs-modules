import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceIdInterface } from '../reference/interfaces/reference-id.interface.js';
import { type ReferenceVersionInterface } from '../reference/interfaces/reference-version.interface.js';

import { type DomainAggregate } from './domain-aggregate.js';
import { type AggregateMetaInterface } from './interfaces/aggregate-meta.interface.js';

export abstract class DomainMapper<
  Entity,
  Props extends PlainLiteralObject,
  A extends DomainAggregate<Props>,
> {
  abstract createAggregate(
    entity: Entity &
      ReferenceIdInterface &
      ReferenceVersionInterface &
      AggregateMetaInterface,
  ): A;

  toDomain(
    entity: Entity &
      ReferenceIdInterface &
      ReferenceVersionInterface &
      AggregateMetaInterface,
  ): A {
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
  abstract toPersistence(
    aggregate: A,
  ): Entity &
    ReferenceIdInterface &
    ReferenceVersionInterface &
    AggregateMetaInterface;
}
