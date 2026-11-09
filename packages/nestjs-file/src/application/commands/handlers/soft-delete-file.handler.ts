import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { TransactionScope } from '@concepta/nestjs-repository';

import { File } from '../../../domain/aggregates/file.js';
import { FileLifecycleService } from '../../../domain/services/file-lifecycle.service.js';
import { FileNotFoundException } from '../../exceptions/file-not-found.exception.js';
import { SoftDeleteFileCommand } from '../impl/soft-delete-file.command.js';

/**
 * Hides the file from reads and leaves the stored object alone. The file
 * keeps its name until it is removed.
 */
@CommandHandler(SoftDeleteFileCommand)
export class SoftDeleteFileHandler implements ICommandHandler<SoftDeleteFileCommand> {
  constructor(
    private readonly fileLifecycle: FileLifecycleService,
    private readonly eventPublisher: EventPublisher,
    private readonly txScope: TransactionScope,
  ) {}

  async execute(command: SoftDeleteFileCommand): Promise<File> {
    const { ctx, id } = command;

    return this.txScope.run(ctx, async (txCtx) => {
      const deleted = await this.fileLifecycle.softDelete(txCtx, id);

      if (!deleted) {
        throw new FileNotFoundException(id);
      }

      const file = this.eventPublisher.mergeObjectContext(deleted);

      txCtx.trx.onCommit(() => file.commit());
      txCtx.trx.onRollback(() => file.uncommit());

      return file;
    });
  }
}
