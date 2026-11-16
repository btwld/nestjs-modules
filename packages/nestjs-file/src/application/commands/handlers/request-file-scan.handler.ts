import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { File } from '../../../domain/aggregates/file.js';
import { FileLifecycleService } from '../../../domain/services/file-lifecycle.service.js';
import { FileScanService } from '../../../domain/services/file-scan.service.js';
import { FileNotFoundException } from '../../exceptions/file-not-found.exception.js';
import { RequestFileScanCommand } from '../impl/request-file-scan.command.js';

/**
 * Re-sends the scan request a file is waiting on. A request the scanner
 * refuses throws `FileScanRequestException` and leaves the file waiting.
 */
@CommandHandler(RequestFileScanCommand)
export class RequestFileScanHandler implements ICommandHandler<RequestFileScanCommand> {
  constructor(
    private readonly fileLifecycle: FileLifecycleService,
    // Without a scanner, no scan is ever requested.
    private readonly fileScan: FileScanService = new FileScanService(),
  ) {}

  async execute(command: RequestFileScanCommand): Promise<File> {
    const { ctx, id } = command;

    const step = await this.fileLifecycle.getScanStep(ctx, id);

    if (!step) {
      throw new FileNotFoundException(id);
    }

    if (step.scanRequest) {
      await this.fileScan.request(ctx, step.scanRequest);
    }

    return step.file;
  }
}
