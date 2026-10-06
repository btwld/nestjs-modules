import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type CacheInterface } from '../interfaces/cache.interface.js';

import { type CacheEventHeaderInterface } from './interfaces/cache-event-header.interface.js';

export class CacheExtendedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost<CacheEventHeaderInterface>,
    public readonly cache: CacheInterface,
  ) {}
}
