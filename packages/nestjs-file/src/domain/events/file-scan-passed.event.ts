import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type FileObjectInterface } from '../interfaces/file-object.interface.js';

/**
 * A scan found the file clean, and it is now `active`.
 */
export class FileScanPassedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost,
    public readonly file: FileObjectInterface,
  ) {}
}
