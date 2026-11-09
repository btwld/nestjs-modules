import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { AppContextHost } from '@concepta/nestjs-core';
import { TransactionScope, TrxCtx } from '@concepta/nestjs-repository';

import { File } from '../../../domain/aggregates/file.js';
import { FileLifecycleService } from '../../../domain/services/file-lifecycle.service.js';
import { FileScanService } from '../../../domain/services/file-scan.service.js';
import { FileNotFoundException } from '../../exceptions/file-not-found.exception.js';
import { FileRejectException } from '../../exceptions/file-reject.exception.js';
import { FileScanResultInTransactionException } from '../../exceptions/file-scan-result-in-transaction.exception.js';
import { RecordFileScanResultCommand } from '../impl/record-file-scan-result.command.js';

/**
 * Records a scan result in its own transaction, then acts on it outside
 * any:
 *
 * - a first uncertain result asks the scanner for the one rescan;
 * - a rejection deletes the stored object, then commits `rejected`. If
 *   storage fails, the file stays `rejecting` and `FileRejectException` is
 *   thrown; recording a result for it again retries the delete.
 *
 * `FileRejectedEvent` is published once `rejecting` commits, before the
 * object is deleted. When two results for a `rejecting` file run at once,
 * both delete the object and the one that commits `rejected` second throws
 * `OptimisticLockException`; the file is rejected either way.
 */
@CommandHandler(RecordFileScanResultCommand)
export class RecordFileScanResultHandler implements ICommandHandler<RecordFileScanResultCommand> {
  constructor(
    private readonly fileLifecycle: FileLifecycleService,
    private readonly eventPublisher: EventPublisher,
    private readonly txScope: TransactionScope,
    // Without a scanner, no rescan is ever requested.
    private readonly fileScan: FileScanService = new FileScanService(),
  ) {}

  async execute(command: RecordFileScanResultCommand): Promise<File> {
    const { ctx, id, scan } = command;

    // Inside a caller's transaction, `rejecting` would not commit before
    // the object is deleted.
    if (AppContextHost.from(ctx).supports(TrxCtx)) {
      throw new FileScanResultInTransactionException();
    }

    const step = await this.txScope.run(ctx, async (txCtx) => {
      const recorded = await this.fileLifecycle.recordScanResult(
        txCtx,
        id,
        scan,
      );

      if (recorded) {
        const file = this.eventPublisher.mergeObjectContext(recorded.file);

        txCtx.trx.onCommit(() => file.commit());
        txCtx.trx.onRollback(() => file.uncommit());
      }

      return recorded;
    });

    if (!step) {
      throw new FileNotFoundException(id);
    }

    if (step.scanRequest) {
      await this.fileScan.request(ctx, step.scanRequest);

      return step.file;
    }

    if (step.file.status !== 'rejecting') {
      return step.file;
    }

    try {
      await this.fileLifecycle.deleteStoredObject(ctx, step.file);
    } catch (originalError) {
      throw new FileRejectException({ id, originalError });
    }

    return this.txScope.run(ctx, (txCtx) =>
      this.fileLifecycle.finishRejection(txCtx, step.file),
    );
  }
}
