import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type File } from '../../../domain/aggregates/file.js';
import { type FileScanOutcomeInterface } from '../../../domain/interfaces/file-scan-outcome.interface.js';

/**
 * Records what a scan found. Dispatch it outside any transaction: a
 * rejection deletes the stored object. Safe to dispatch again: a result for
 * an attempt the file no longer waits on changes nothing, and one for a
 * file still `rejecting` finishes deleting its object.
 */
export class RecordFileScanResultCommand extends Command<File> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly id: ReferenceId,
    public readonly scan: FileScanOutcomeInterface,
  ) {
    super();
  }
}
