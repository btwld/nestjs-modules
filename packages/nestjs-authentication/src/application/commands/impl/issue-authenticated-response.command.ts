import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import { type AuthenticatedResponseInterface } from '../../../domain/interfaces/authenticated-response.interface.js';

export class IssueAuthenticatedResponseCommand extends Command<AuthenticatedResponseInterface> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly id: ReferenceId,
  ) {
    super();
  }
}
