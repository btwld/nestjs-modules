import { type Type } from '@nestjs/common';
import { type OutboxModule } from '@nestjs/outbox';

import { type DurableDriverInterface } from './durable-driver.interface.js';

/**
 * `DurableMessagingModule.forRoot()` options.
 */
export interface DurableMessagingOptionsInterface {
  /**
   * The `RepositoryModule.forRoot()` key of the registration whose
   * datasource holds the outbox. Messages are published in that
   * registration's transaction.
   */
  key: string;

  /** The driver's durable support, from its `optional/outbox` entry point. */
  driver: Type<DurableDriverInterface>;

  /** Passed to `OutboxModule.forRoot()`: relay, retry, transports. */
  outbox?: Parameters<typeof OutboxModule.forRoot>[0];
}
