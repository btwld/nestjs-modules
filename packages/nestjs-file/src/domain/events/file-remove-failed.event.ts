import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type FileInterface } from '../interfaces/file.interface.js';

/**
 * Published once a removal is recorded as failed (`remove-failed`): storage
 * couldn't delete the object, or the file was restored while it was deleted.
 */
export class FileRemoveFailedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost,
    public readonly file: FileInterface,
  ) {}
}
