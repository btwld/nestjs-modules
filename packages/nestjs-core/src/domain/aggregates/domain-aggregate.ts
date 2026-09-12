import { type PlainLiteralObject } from '@nestjs/common';
import { AggregateRoot } from '@nestjs/cqrs';

import { type AggregateMetaInterface } from './interfaces/aggregate-meta.interface.js';

export abstract class DomainAggregate<
  T extends PlainLiteralObject,
> extends AggregateRoot {
  readonly id: string;
  protected props: T;
  private _version: number;
  private _meta: AggregateMetaInterface;

  constructor(
    id: string,
    props: T,
    version: number = 1,
    meta?: AggregateMetaInterface,
  ) {
    super();
    this.id = id;
    this.props = { ...props };
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
