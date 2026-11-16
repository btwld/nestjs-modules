import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { TransactionScope } from '@concepta/nestjs-repository';

import { File } from '../../../domain/aggregates/file.js';
import { FileLifecycleService } from '../../../domain/services/file-lifecycle.service.js';
import { FileNotFoundException } from '../../exceptions/file-not-found.exception.js';
import { RestoreFileCommand } from '../impl/restore-file.command.js';

/**
 * Brings a soft-deleted file back into reads.
 */
@CommandHandler(RestoreFileCommand)
export class RestoreFileHandler implements ICommandHandler<RestoreFileCommand> {
  constructor(
    private readonly fileLifecycle: FileLifecycleService,
    private readonly eventPublisher: EventPublisher,
    private readonly txScope: TransactionScope,
  ) {}

  async execute(command: RestoreFileCommand): Promise<File> {
    const { ctx, id } = command;

    return this.txScope.run(ctx, async (txCtx) => {
      const restored = await this.fileLifecycle.restore(txCtx, id);

      if (!restored) {
        throw new FileNotFoundException(id);
      }

      const file = this.eventPublisher.mergeObjectContext(restored);

      txCtx.trx.onCommit(() => file.commit());
      txCtx.trx.onRollback(() => file.uncommit());

      return file;
    });
  }
}
