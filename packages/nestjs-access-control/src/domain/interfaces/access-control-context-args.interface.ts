import { type ExecutionContext, type PlainLiteralObject } from '@nestjs/common';

import { type AccessAbility } from './access-ability.type.js';
import { type AccessQueryInterface } from './access-query.interface.js';

export interface AccessControlContextArgsInterface {
  ctx: PlainLiteralObject;
  query: AccessQueryInterface;
  ability: AccessAbility;
  request: unknown;
  executionContext: ExecutionContext;
}
