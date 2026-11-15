import { type PlainLiteralObject } from '@nestjs/common';

import {
  type Actor,
  actorKeys,
  type AuthorityRuleInterface,
} from '@concepta/nestjs-core';

import { type AccessGrantsProviderInterface } from '../../domain/interfaces/access-grants-provider.interface.js';
import { type AccessGrants } from '../../domain/interfaces/access-grants.type.js';

/**
 * The default grants provider: the rules in the module's settings, keyed
 * by actor. A person gets the rules of each of their roles; a system gets
 * its own.
 */
export class StaticAccessGrantsProvider implements AccessGrantsProviderInterface {
  constructor(private readonly grants: AccessGrants) {}

  async rulesFor(
    _ctx: PlainLiteralObject,
    actor: Actor,
  ): Promise<AuthorityRuleInterface<string>[]> {
    return actorKeys(actor).flatMap((key) => this.grants[key] ?? []);
  }
}
