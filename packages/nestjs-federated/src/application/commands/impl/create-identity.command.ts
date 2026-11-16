import { type PlainLiteralObject } from '@nestjs/common';
import { Command } from '@nestjs/cqrs';

import { type Identity } from '../../../domain/aggregates/identity.js';
import { type IdentityCreatableInterface } from '../../../domain/interfaces/identity-creatable.interface.js';

export class CreateIdentityCommand extends Command<Identity> {
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly dto: IdentityCreatableInterface,
  ) {
    super();
  }
}
