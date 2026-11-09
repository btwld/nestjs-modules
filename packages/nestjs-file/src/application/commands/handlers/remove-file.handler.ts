import { type PlainLiteralObject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { AppContextHost } from '@concepta/nestjs-core';
import {
  OptimisticLockException,
  TransactionScope,
  TrxCtx,
} from '@concepta/nestjs-repository';

import { File } from '../../../domain/aggregates/file.js';
import { FileLifecycleService } from '../../../domain/services/file-lifecycle.service.js';
import { FileNotFoundException } from '../../exceptions/file-not-found.exception.js';
import { FileRemoveInTransactionException } from '../../exceptions/file-remove-in-transaction.exception.js';
import { FileRemoveException } from '../../exceptions/file-remove.exception.js';
import { RemoveFileCommand } from '../impl/remove-file.command.js';

/**
 * Removes a file in three transactions, with the storage call between them,
 * so the row never points at a missing object without saying so:
 *
 * 1. commit `removing`;
 * 2. delete the stored object, outside any transaction;
 * 3. delete the row, or commit `remove-failed`.
 *
 * A soft-deleted file is hidden from reads already and can't change status,
 * so steps 1 and 3 write no status for it: it stays soft-deleted until its
 * row is deleted. If it was restored during step 2, the row delete loses its
 * version guard, the restored file is marked `remove-failed`, and the
 * `OptimisticLockException` is rethrown.
 */
@CommandHandler(RemoveFileCommand)
export class RemoveFileHandler implements ICommandHandler<RemoveFileCommand> {
  constructor(
    private readonly fileLifecycle: FileLifecycleService,
    private readonly eventPublisher: EventPublisher,
    private readonly txScope: TransactionScope,
  ) {}

  async execute(command: RemoveFileCommand): Promise<File> {
    const { ctx, id } = command;

    // Inside a caller's transaction, step 1 would not commit before step 2.
    if (AppContextHost.from(ctx).supports(TrxCtx)) {
      throw new FileRemoveInTransactionException();
    }

    const removing = await this.txScope.run(ctx, (txCtx) =>
      this.fileLifecycle.beginRemoval(txCtx, id),
    );

    if (!removing) {
      throw new FileNotFoundException(id);
    }

    try {
      await this.fileLifecycle.deleteStoredObject(ctx, removing);
    } catch (originalError) {
      try {
        await this.recordFailure(ctx, (txCtx) =>
          this.fileLifecycle.failRemoval(txCtx, removing),
        );
      } catch (statusError) {
        // The failure couldn't be recorded either; the storage error still wins.
        throw new FileRemoveException({ id, originalError, statusError });
      }

      throw new FileRemoveException({ id, originalError });
    }

    try {
      return await this.txScope.run(ctx, async (txCtx) => {
        const file = this.eventPublisher.mergeObjectContext(removing);

        await this.fileLifecycle.finishRemoval(txCtx, file);

        txCtx.trx.onCommit(() => file.commit());
        txCtx.trx.onRollback(() => file.uncommit());

        return file;
      });
    } catch (error) {
      // A soft-deleted file has no `removing` to hold off a restore, so the
      // row may be live again with its object gone.
      if (removing.isSoftDeleted && error instanceof OptimisticLockException) {
        await this.recordFailure(ctx, (txCtx) =>
          this.fileLifecycle.failRestoredRemoval(txCtx, removing),
        );
      }

      throw error;
    }
  }

  /**
   * Writes `remove-failed` in its own transaction and publishes
   * `FileRemoveFailedEvent` once it commits.
   */
  private async recordFailure(
    ctx: PlainLiteralObject,
    write: (txCtx: PlainLiteralObject) => Promise<File | null>,
  ): Promise<void> {
    await this.txScope.run(ctx, async (txCtx) => {
      const failed = await write(txCtx);

      if (failed) {
        const file = this.eventPublisher.mergeObjectContext(failed);

        txCtx.trx.onCommit(() => file.commit());
        txCtx.trx.onRollback(() => file.uncommit());
      }
    });
  }
}
