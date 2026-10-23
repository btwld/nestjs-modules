import { Injectable, Module } from '@nestjs/common';
import { InMemoryOutboxStore } from '@nestjs/outbox';

import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import { type DynamicRepositoryModule } from '../../interfaces/repository-module.interface.js';
import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
import { type TransactionInterface } from '../../transaction/interfaces/transaction.interface.js';
import { UnsupportedDurableDriverException } from '../exceptions/unsupported-durable-driver.exception.js';
import { type DurableBindingInterface } from '../interfaces/durable-binding.interface.js';
import { type DurableDriverInterface } from '../interfaces/durable-driver.interface.js';

export const DURABLE_TRANSACTION_KEY = 'memory:durable';

/** The store every fixture binds to; replace it before each test. */
export const durableStoreFixture: { store: InMemoryOutboxStore } = {
  store: new InMemoryOutboxStore(),
};

/**
 * A transaction the in-memory outbox store joins. The store applies writes
 * made through a handle from its own `transaction()` only when that work
 * resolves, and drops them when it rejects; any other handle is written at
 * once, which would make every rollback test pass for the wrong reason.
 * `start()` keeps both the handle and the promise `transaction()` returns,
 * and `commit()`/`rollback()` settle the work and await that promise, so
 * a rollback leaves no unhandled rejection behind.
 */
export function createOutboxTransactionFixture(
  store: InMemoryOutboxStore,
): TransactionInterface {
  let handle: unknown;
  let active = false;
  let pending: Promise<void> | undefined;
  let settle:
    { resolve: () => void; reject: (reason: unknown) => void } | undefined;

  const getClient = vi.fn();
  getClient.mockImplementation(() => handle);

  return {
    get isActive() {
      return active;
    },
    start: async () => {
      await new Promise<void>((opened) => {
        pending = store.transaction(
          (tx) =>
            new Promise<void>((resolve, reject) => {
              handle = tx;
              settle = { resolve, reject };
              opened();
            }),
        );
      });
      active = true;
    },
    commit: async () => {
      settle?.resolve();
      await pending;
      active = false;
    },
    rollback: async () => {
      settle?.reject(new Error('rolled back'));
      await pending?.catch(() => undefined);
      active = false;
    },
    getClient,
  };
}

/**
 * The memory driver, plus a transaction factory under
 * `DURABLE_TRANSACTION_KEY` whose transactions the outbox store joins.
 */
@Module({})
export class DurableMemoryRepositoryModuleFixture {
  static register(
    entities: RepositoryProviderOptions[],
  ): DynamicRepositoryModule {
    return {
      ...MemoryRepositoryModuleFixture.register(entities),
      module: DurableMemoryRepositoryModuleFixture,
      transactionFactories: [
        {
          key: DURABLE_TRANSACTION_KEY,
          inject: [],
          useFactory: () => ({
            create: () =>
              createOutboxTransactionFixture(durableStoreFixture.store),
          }),
        },
      ],
    };
  }
}

/** Binds every registration to the fixture store and transaction key. */
@Injectable()
export class DurableDriverFixture implements DurableDriverInterface {
  bind(): DurableBindingInterface {
    return {
      transactionKey: DURABLE_TRANSACTION_KEY,
      store: durableStoreFixture.store,
    };
  }
}

/** A driver that cannot carry durable messaging. */
@Injectable()
export class RefusingDurableDriverFixture implements DurableDriverInterface {
  bind(): DurableBindingInterface {
    throw new UnsupportedDurableDriverException(
      'widgets',
      'the driver has no transactions',
    );
  }
}
