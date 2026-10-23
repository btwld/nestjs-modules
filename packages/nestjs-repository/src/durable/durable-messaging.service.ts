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
import { TransactionScope } from '../transaction/transaction-scope.js';

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
    private readonly txScope: TransactionScope,
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
   * transaction to join, and resolving it throws.
   */
  async publish(
    ctx: PlainLiteralObject,
    messages: NewOutboxMessage[],
  ): Promise<void> {
    const { trx } = AppContextHost.from(ctx).with(TrxCtx);
    const transaction = await trx.getOrStart(this.binding.transactionKey);

    await this.outbox.add(transaction.getClient(), messages);

    trx.onCommit(() => this.outbox.notify());
  }

  /**
   * Record `messageId` for `consumer` and run `work` once, both in one
   * transaction: a repeated delivery returns `{ duplicate: true }` without
   * running `work`.
   *
   * Opens a transaction scope, or joins the one `ctx` is already in. If
   * `work` throws, that whole scope rolls back — the inbox record and, in a
   * joined scope, the caller's earlier writes with it.
   */
  once<T>(
    ctx: PlainLiteralObject,
    consumer: string,
    messageId: string,
    work: (txCtx: TransactionContextInterface) => Promise<T>,
  ): Promise<OutboxInboxResult<T>> {
    return this.txScope.run(ctx, async (txCtx) => {
      const transaction = await txCtx.trx.getOrStart(
        this.binding.transactionKey,
      );

      return this.inbox.processInTransaction(
        transaction.getClient(),
        consumer,
        messageId,
        () => work(txCtx),
      );
    });
  }
}
