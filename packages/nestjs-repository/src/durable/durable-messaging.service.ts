import {
  Inject,
  Injectable,
  type OnModuleInit,
  PlainLiteralObject,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  type NewOutboxMessage,
  Outbox,
  OutboxInbox,
  type OutboxInboxResult,
} from '@nestjs/outbox';

import { AppContextHost, RuntimeException } from '@concepta/nestjs-core';

import {
  type TransactionContextInterface,
  TrxCtx,
} from '../transaction/interfaces/transaction-context.interface.js';
import { type TransactionManagerInterface } from '../transaction/interfaces/transaction-manager.interface.js';

import { DURABLE_MESSAGING_BINDING } from './durable-messaging.constants.js';
import { type DurableBindingInterface } from './interfaces/durable-binding.interface.js';

/**
 * Publishes outbox messages and records inbox deliveries in the transaction
 * of the registration `DurableMessagingModule` is bound to, so a message
 * commits or rolls back with the writes beside it.
 */
@Injectable()
export class DurableMessaging implements OnModuleInit {
  constructor(
    @Inject(DURABLE_MESSAGING_BINDING)
    private readonly binding: DurableBindingInterface,
    private readonly outbox: Outbox,
    private readonly inbox: OutboxInbox,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * A second `DurableMessagingModule.forRoot()` would bring a second global
   * outbox: a second relay, and `Outbox`/`OutboxInbox` resolving to either
   * one.
   */
  onModuleInit(): void {
    const bindings = this.moduleRef.get(DURABLE_MESSAGING_BINDING, {
      strict: false,
      each: true,
    });

    if (bindings.length > 1) {
      throw new RuntimeException({
        message:
          'DurableMessagingModule.forRoot() is imported %s times; import it ' +
          'once per application',
        messageParams: [bindings.length],
        fault: 'usage',
      });
    }
  }

  /**
   * Write `messages` in the transaction `ctx` is running, through the bound
   * registration's connection. The relay is woken when that transaction
   * commits; nothing is published if it rolls back.
   *
   * Call it inside `TransactionScope.run()`; outside one there is no
   * transaction to join, and resolving it throws. If it fails, the run
   * fails, even if you catch the error.
   */
  async publish(
    ctx: PlainLiteralObject,
    messages: NewOutboxMessage[],
  ): Promise<void> {
    const { trx } = AppContextHost.from(ctx).with(TrxCtx);

    await this.joined(trx, async (client) => {
      await this.outbox.add(client, messages);
    });

    trx.onCommit(() => this.outbox.notify());
  }

  /**
   * Record `messageId` for `consumer` and run `work` once, both in the
   * transaction `ctx` is running: a repeated delivery returns
   * `{ duplicate: true }` without running `work`.
   *
   * Call it inside `TransactionScope.run()`; outside one there is no
   * transaction to join, and resolving it throws. If `work` or the record
   * fails, the run fails, even if you catch the error: none of its writes
   * are kept, the inbox record included.
   */
  async once<T>(
    ctx: PlainLiteralObject,
    consumer: string,
    messageId: string,
    work: (txCtx: TransactionContextInterface) => Promise<T>,
  ): Promise<OutboxInboxResult<T>> {
    const txCtx = AppContextHost.from(ctx).with(TrxCtx);

    return this.joined(txCtx.trx, async (client) =>
      this.inbox.processInTransaction(client, consumer, messageId, () =>
        work(txCtx),
      ),
    );
  }

  /**
   * Join the run's transaction on the bound registration and `use` it,
   * failing the scope if either fails, even if the caller catches it:
   * nothing `use` wrote is kept, and the database may have ended the
   * transaction it ran in.
   */
  private async joined<T>(
    trx: TransactionManagerInterface,
    use: (client: unknown) => Promise<T>,
  ): Promise<T> {
    try {
      const transaction = await trx.getOrStart(this.binding.transactionKey);
      return await use(transaction.getClient());
    } catch (error) {
      trx.markFailed(error);
      throw error;
    }
  }
}
