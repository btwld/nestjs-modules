import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type FileObjectInterface } from '../interfaces/file-object.interface.js';

/**
 * The first scan was uncertain; the file is `rescanning`, and the one rescan
 * is requested next.
 */
export class FileScanRetriedEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost,
    public readonly file: FileObjectInterface,
  ) {}
}
