import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { TransactionScope } from '@concepta/nestjs-repository';

import { type FileReadResultInterface } from '../../../domain/interfaces/file-read-result.interface.js';
import { FileLifecycleService } from '../../../domain/services/file-lifecycle.service.js';
import { FileScanService } from '../../../domain/services/file-scan.service.js';
import { FileStorageService } from '../../../domain/services/file-storage.service.js';
import { FileNotFoundException } from '../../exceptions/file-not-found.exception.js';
import { ConfirmFileUploadCommand } from '../impl/confirm-file-upload.command.js';

/**
 * Confirms an upload. With a scanner, the file is `scanning` and the scan is
 * requested once the confirm commits, so the scanner never sees a file whose
 * confirm rolled back. A request the scanner refuses is logged by the
 * transaction, as a failed commit callback, and leaves the file `scanning`,
 * blocked, until `RequestFileScanCommand` sends it again.
 */
@CommandHandler(ConfirmFileUploadCommand)
export class ConfirmFileUploadHandler implements ICommandHandler<ConfirmFileUploadCommand> {
  constructor(
    private readonly fileLifecycle: FileLifecycleService,
    private readonly fileStorage: FileStorageService,
    private readonly eventPublisher: EventPublisher,
    private readonly txScope: TransactionScope,
    // Without a scanner, no scan is ever requested.
    private readonly fileScan: FileScanService = new FileScanService(),
  ) {}

  async execute(
    command: ConfirmFileUploadCommand,
  ): Promise<FileReadResultInterface> {
    const { ctx, id } = command;

    return this.txScope.run(ctx, async (txCtx) => {
      const step = await this.fileLifecycle.confirmUpload(txCtx, id);

      if (!step) {
        throw new FileNotFoundException(id);
      }

      const file = this.eventPublisher.mergeObjectContext(step.file);
      const { scanRequest } = step;

      txCtx.trx.onCommit(() => file.commit());
      txCtx.trx.onRollback(() => file.uncommit());

      if (scanRequest) {
        txCtx.trx.onCommit(() => this.fileScan.request(ctx, scanRequest));
      }

      // Inside the transaction, so a storage failure rolls the confirm back.
      return this.fileStorage.toReadResult(ctx, file);
    });
  }
}
