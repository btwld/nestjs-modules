import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { TransactionScope } from '@concepta/nestjs-repository';

import { type FileCreatedResultInterface } from '../../../domain/interfaces/file-created-result.interface.js';
import { FileLifecycleService } from '../../../domain/services/file-lifecycle.service.js';
import { FileStorageService } from '../../../domain/services/file-storage.service.js';
import { CreateFileCommand } from '../impl/create-file.command.js';

@CommandHandler(CreateFileCommand)
export class CreateFileHandler implements ICommandHandler<CreateFileCommand> {
  constructor(
    private readonly fileLifecycle: FileLifecycleService,
    private readonly fileStorage: FileStorageService,
    private readonly eventPublisher: EventPublisher,
    private readonly txScope: TransactionScope,
  ) {}

  async execute(
    command: CreateFileCommand,
  ): Promise<FileCreatedResultInterface> {
    const { ctx, dto } = command;

    return this.txScope.run(ctx, async (txCtx) => {
      const file = this.eventPublisher.mergeObjectContext(
        await this.fileLifecycle.create(txCtx, dto),
      );

      // Inside the transaction, so a storage failure rolls the row back.
      const result = await this.fileStorage.toCreatedResult(ctx, file);

      txCtx.trx.onCommit(() => file.commit());
      txCtx.trx.onRollback(() => file.uncommit());

      return result;
    });
  }
}
