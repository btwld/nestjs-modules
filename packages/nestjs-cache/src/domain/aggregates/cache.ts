import { randomUUID } from 'crypto';

import {
  type DomainFactory,
  type EventContextHost,
} from '@concepta/nestjs-core';
import {
  type AggregateMetaInterface,
  DomainAggregate,
} from '@concepta/nestjs-core/aggregate';

import { CacheCreatedEvent } from '../events/cache-created.event.js';
import { CacheExtendedEvent } from '../events/cache-extended.event.js';
import { CacheReplacedEvent } from '../events/cache-replaced.event.js';
import { CacheUpdatedEvent } from '../events/cache-updated.event.js';
import { type CacheEventHeaderInterface } from '../events/interfaces/cache-event-header.interface.js';
import { type CacheCreatableInterface } from '../interfaces/cache-creatable.interface.js';
import { type CacheInterface } from '../interfaces/cache.interface.js';

export class Cache extends DomainAggregate<CacheInterface> {
  constructor(
    id: string,
    props: CacheInterface,
    version?: number,
    meta?: AggregateMetaInterface,
  ) {
    super(id, props, version, meta);
  }

  get key() {
    return this.props.key;
  }
  get type() {
    return this.props.type;
  }
  get assigneeId() {
    return this.props.assigneeId;
  }
  get data() {
    return this.props.data;
  }
  get expirationDate() {
    return this.props.expirationDate;
  }

  static create(
    eventContext: EventContextHost<CacheEventHeaderInterface>,
    dto: CacheCreatableInterface,
    expirationDate: Date | null,
  ): Cache {
    return Cache.createWithId(eventContext, randomUUID(), dto, expirationDate);
  }

  static createWithId(
    eventContext: EventContextHost<CacheEventHeaderInterface>,
    id: string,
    dto: CacheCreatableInterface,
    expirationDate: Date | null,
  ): Cache {
    const { key, type, assigneeId, data } = dto;

    const cache = new Cache(id, {
      key,
      type,
      assigneeId,
      data: data ?? null,
      expirationDate,
    });

    cache.apply(new CacheCreatedEvent(eventContext, cache.toPlain()));

    return cache;
  }

  replace(
    eventContext: EventContextHost<CacheEventHeaderInterface>,
    dto: CacheCreatableInterface,
    expirationDate: Date | null,
  ): void {
    const { key, type, assigneeId, data } = dto;
    this.props = {
      key,
      type,
      assigneeId,
      data: data ?? null,
      expirationDate,
    };
    this.incrementVersion();
    this.apply(new CacheReplacedEvent(eventContext, this.toPlain()));
  }

  updateData(
    eventContext: EventContextHost<CacheEventHeaderInterface>,
    newData: string | null,
  ): void {
    this.props = {
      ...this.props,
      data: newData,
    };
    this.incrementVersion();
    this.apply(new CacheUpdatedEvent(eventContext, this.toPlain()));
  }

  extend(
    eventContext: EventContextHost<CacheEventHeaderInterface>,
    expirationDate: Date | null,
  ): void {
    this.props = {
      ...this.props,
      expirationDate,
    };
    this.incrementVersion();
    this.apply(new CacheExtendedEvent(eventContext, this.toPlain()));
  }
}

Cache satisfies DomainFactory<CacheCreatableInterface, Cache>;
