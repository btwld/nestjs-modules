import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type FileObjectInterface } from '../interfaces/file-object.interface.js';
import { type FileScanOutcomeInterface } from '../interfaces/file-scan-outcome.interface.js';

/**
 * A scan rejected the file: it was infected, or uncertain twice. The file is
 * `rejecting`, and its stored object is deleted next. `scan` is the result
 * that decided it.
 */
export class FileRejectedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost,
    public readonly file: FileObjectInterface,
    public readonly scan: FileScanOutcomeInterface,
  ) {}
}
