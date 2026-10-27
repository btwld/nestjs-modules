import { type IEvent } from '@nestjs/cqrs';

import { type EventContextHost } from '@concepta/nestjs-core';

import { type FileInterface } from '../interfaces/file.interface.js';

export class FileRestoredEvent implements IEvent {
  constructor(
    public readonly eventContext: EventContextHost,
    public readonly file: FileInterface,
  ) {}
}
