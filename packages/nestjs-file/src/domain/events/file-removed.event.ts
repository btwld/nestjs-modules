import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type FileInterface } from '../interfaces/file.interface.js';

/**
 * Published once the row is deleted, after the stored object is.
 */
export class FileRemovedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost,
    public readonly file: FileInterface,
  ) {}
}
