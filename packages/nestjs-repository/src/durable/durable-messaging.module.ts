import { type DynamicModule, Module } from '@nestjs/common';
import { OutboxModule, OutboxStorage } from '@nestjs/outbox';

import {
  REPOSITORY_BINDING,
  type RepositoryBinding,
} from '../repository-binding.js';

import {
  DURABLE_MESSAGING_BINDING,
  DURABLE_MESSAGING_STORE,
} from './durable-messaging.constants.js';
import { DurableMessaging } from './durable-messaging.service.js';
import { UnsupportedDurableDriverException } from './exceptions/unsupported-durable-driver.exception.js';
import { type DurableBindingInterface } from './interfaces/durable-binding.interface.js';
import { type DurableDriverInterface } from './interfaces/durable-driver.interface.js';
import { type DurableMessagingOptionsInterface } from './interfaces/durable-messaging-options.interface.js';

/**
 * Durable messaging for one registration: sets up `OutboxModule`, asks the
 * registration's driver for a store on its datasource, and provides
 * `DurableMessaging`. Import `forRoot()` once per application, after
 * `RepositoryModule.forRoot()`.
 */
@Module({})
export class DurableMessagingModule {
  static forRoot(options: DurableMessagingOptionsInterface): DynamicModule {
    const { key, driver, outbox } = options;

    return {
      module: DurableMessagingModule,
      imports: [OutboxModule.forRoot(outbox)],
      providers: [
        driver,
        {
          provide: DURABLE_MESSAGING_BINDING,
          inject: [REPOSITORY_BINDING, OutboxStorage, driver],
          // A factory, not a lifecycle hook: the store must be registered
          // before OutboxModule.onModuleInit() fixes the registry.
          useFactory: (
            binding: RepositoryBinding,
            storage: OutboxStorage,
            durable: DurableDriverInterface,
          ): DurableBindingInterface => {
            const repository = binding.get(key);

            if (!repository) {
              throw new UnsupportedDurableDriverException(
                key,
                'no repository is registered under this key',
              );
            }

            const bound = durable.bind(repository);

            storage.registerSource({
              messages: bound.store,
              inbox: bound.store,
            });

            return bound;
          },
        },
        {
          provide: DURABLE_MESSAGING_STORE,
          inject: [DURABLE_MESSAGING_BINDING],
          useFactory: ({ store }: DurableBindingInterface) => store,
        },
        DurableMessaging,
      ],
      exports: [DurableMessaging],
    };
  }
}
