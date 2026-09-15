import { Injectable } from '@nestjs/common';

import { TransactionFactoryInterface } from '../interfaces/transaction-factory.interface.js';

import { TransactionQueue } from './transaction-queue.js';

export const TRANSACTION_FACTORY_REGISTRY = Symbol(
  'TransactionFactoryRegistry',
);

/**
 * Registry for transaction factories.
 * Each repository module registers its factory keyed by "driver:datasource".
 *
 * Also the app-wide home for the per-key {@link TransactionQueue}s that
 * back `supportsConcurrentTransactions: false` factories — one shared
 * instance for the whole app, same as the factory map itself, so every
 * `TransactionManager` (one per `TransactionScope.run()` scope) serializes
 * against the same queue rather than each other.
 */
@Injectable()
export class TransactionFactoryRegistry {
  private readonly factories = new Map<string, TransactionFactoryInterface>();
  private readonly queues = new Map<string, TransactionQueue>();

  register(key: string, factory: TransactionFactoryInterface): void {
    if (!this.factories.has(key)) {
      this.factories.set(key, factory);
    }
  }

  get(key: string): TransactionFactoryInterface | undefined {
    return this.factories.get(key);
  }

  get count(): number {
    return this.factories.size;
  }

  /**
   * The queue to serialize against for `key`, or `undefined` if the
   * registered factory allows concurrent transactions (the default) or no
   * factory is registered for `key` at all.
   */
  queueFor(key: string): TransactionQueue | undefined {
    const factory = this.factories.get(key);

    if (!factory || factory.supportsConcurrentTransactions !== false) {
      return undefined;
    }

    const existing = this.queues.get(key);
    if (existing) {
      return existing;
    }

    const queue = new TransactionQueue();
    this.queues.set(key, queue);
    return queue;
  }
}
