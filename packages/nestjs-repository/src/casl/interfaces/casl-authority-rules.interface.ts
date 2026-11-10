import { type PlainLiteralObject } from '@nestjs/common';

import { type Actor } from '@concepta/nestjs-core';

import { type CaslAuthorityRule } from './casl-authority-rule.type.js';

/**
 * Where an application keeps its rules: in settings, a table, or another
 * service. Asked once per `ctx`, so every check in a call reads the same
 * rules.
 */
export interface CaslAuthorityRulesInterface {
  rulesFor(
    ctx: PlainLiteralObject,
    actor: Actor,
  ): readonly CaslAuthorityRule[] | Promise<readonly CaslAuthorityRule[]>;
}
