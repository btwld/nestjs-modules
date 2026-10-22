import { type PlainLiteralObject } from '@nestjs/common';

import { type AuditDateCreated } from '../audit/interfaces/audit.types.js';

import { DomainAggregate } from './domain-aggregate.js';

/**
 * An aggregate whose record is written once and never changed: no version,
 * no updated or deleted date.
 *
 * Pairs with `writePolicy: { access: 'append-only', reason }` and an
 * append-only base entity. To change one, create a new record that corrects
 * it (see `CorrectableInterface`).
 *
 * The aggregate owns `dateCreated`: it is stamped at construction, `toPlain()`
 * emits it, and what it emits is what gets stored.
 */
export abstract class AppendOnlyAggregate<
  T extends PlainLiteralObject,
> extends DomainAggregate<T> {
  readonly dateCreated: AuditDateCreated;

  constructor(
    id: string,
    props: T,
    dateCreated: AuditDateCreated = new Date(),
  ) {
    super(id, props);
    this.dateCreated = dateCreated;
  }

  toPlain() {
    return {
      id: this.id,
      ...this.props,
      dateCreated: this.dateCreated,
    };
  }
}
