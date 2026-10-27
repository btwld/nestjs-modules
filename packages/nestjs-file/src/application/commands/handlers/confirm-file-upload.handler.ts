import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { TransactionScope } from '@concepta/nestjs-repository';

import { type FileReadResultInterface } from '../../../domain/interfaces/file-read-result.interface.js';
import { FileLifecycleService } from '../../../domain/services/file-lifecycle.service.js';
import { FileStorageService } from '../../../domain/services/file-storage.service.js';
import { FileNotFoundException } from '../../exceptions/file-not-found.exception.js';
import { ConfirmFileUploadCommand } from '../impl/confirm-file-upload.command.js';

@CommandHandler(ConfirmFileUploadCommand)
export class ConfirmFileUploadHandler implements ICommandHandler<ConfirmFileUploadCommand> {
  constructor(
    private readonly fileLifecycle: FileLifecycleService,
    private readonly fileStorage: FileStorageService,
    private readonly eventPublisher: EventPublisher,
    private readonly txScope: TransactionScope,
  ) {}

  async execute(
    command: ConfirmFileUploadCommand,
  ): Promise<FileReadResultInterface> {
    const { ctx, id } = command;

    return this.txScope.run(ctx, async (txCtx) => {
      const confirmed = await this.fileLifecycle.confirmUpload(txCtx, id);

      if (!confirmed) {
        throw new FileNotFoundException(id);
      }

      const file = this.eventPublisher.mergeObjectContext(confirmed);

      txCtx.trx.onCommit(() => file.commit());
      txCtx.trx.onRollback(() => file.uncommit());

      // Inside the transaction, so a storage failure rolls the confirm back.
      return this.fileStorage.toReadResult(ctx, file);
    });
  }
}
