import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type File } from '../../../domain/aggregates/file.js';

/**
 * Sends the scanner the request for the scan a `scanning` or `rescanning`
 * file is waiting on, again, and changes nothing. Dispatch it from your sweep
 * for files that waited too long: a request that failed or was lost is sent
 * once more, and the scanner's answer is recorded as usual. A file no longer
 * waiting on a scan is returned with no request sent.
 */
export class RequestFileScanCommand extends Command<File> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly id: ReferenceId,
  ) {
    super();
  }
}
