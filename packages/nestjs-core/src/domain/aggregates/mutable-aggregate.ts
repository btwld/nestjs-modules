import { type PlainLiteralObject } from '@nestjs/common';

import { DomainAggregate } from './domain-aggregate.js';
import { type AggregateMetaInterface } from './interfaces/aggregate-meta.interface.js';

/**
 * An aggregate whose record changes over time: a version for optimistic
 * locking, plus created, updated and deleted dates.
 *
 * Pairs with `writePolicy: { access: 'mutable' }` and an audited base entity.
 * The aggregate owns its dates: `toPlain()` emits them, and what it emits is
 * what gets stored.
 */
export abstract class MutableAggregate<
  T extends PlainLiteralObject,
> extends DomainAggregate<T> {
  private _version: number;
  private _meta: AggregateMetaInterface;

  constructor(
    id: string,
    props: T,
    version: number = 1,
    meta?: AggregateMetaInterface,
  ) {
    super(id, props);
    this._version = version;
    this._meta = meta ?? {
      dateCreated: new Date(),
      dateUpdated: new Date(),
      dateDeleted: null,
    };
  }

  get version(): number {
    return this._version;
  }

  get meta(): AggregateMetaInterface {
    return this._meta;
  }

  stampCreated(): void {
    const now = new Date();
    this._meta = {
      dateCreated: now,
      dateUpdated: now,
      dateDeleted: null,
    };
  }

  stampUpdated(): void {
    if (!this._meta.dateCreated) {
      this.stampCreated();
    } else {
      this._meta = { ...this._meta, dateUpdated: new Date() };
    }
  }

  stampDeleted(): void {
    this._meta = {
      ...this._meta,
      dateDeleted: new Date(),
      dateUpdated: new Date(),
    };
  }

  protected incrementVersion(): void {
    this._version = this.version + 1;
  }

  toPlain() {
    return {
      id: this.id,
      version: this.version,
      ...this.props,
      ...this.meta,
    };
  }
}
