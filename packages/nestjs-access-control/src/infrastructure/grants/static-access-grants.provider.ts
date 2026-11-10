import { type PlainLiteralObject } from '@nestjs/common';

import { type AccessActor } from '../../domain/interfaces/access-actor.type.js';
import { type AccessGrantsProviderInterface } from '../../domain/interfaces/access-grants-provider.interface.js';
import { type AccessGrants } from '../../domain/interfaces/access-grants.type.js';
import { type AccessRuleInterface } from '../../domain/interfaces/access-rule.interface.js';

/**
 * The default grants provider: the rules in the module's settings, keyed
 * by actor. A person gets the rules of each of their roles; a system gets
 * its own.
 */
export class StaticAccessGrantsProvider implements AccessGrantsProviderInterface {
  constructor(private readonly grants: AccessGrants) {}

  async rulesFor(
    _ctx: PlainLiteralObject,
    actor: AccessActor,
  ): Promise<AccessRuleInterface[]> {
    const keys =
      actor.kind === 'system'
        ? [`system:${actor.name}`]
        : actor.roles.map((role) => `role:${role}`);

    return keys.flatMap((key) => this.grants[key] ?? []);
  }
}
