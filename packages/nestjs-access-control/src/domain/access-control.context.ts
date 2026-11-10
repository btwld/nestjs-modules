import { type ExecutionContext, type PlainLiteralObject } from '@nestjs/common';

import { type AccessAbility } from './interfaces/access-ability.type.js';
import { type AccessActor } from './interfaces/access-actor.type.js';
import { type AccessControlContextArgsInterface } from './interfaces/access-control-context-args.interface.js';
import { type AccessControlContextInterface } from './interfaces/access-control-context.interface.js';
import { type AccessQueryInterface } from './interfaces/access-query.interface.js';

export class AccessControlContext implements AccessControlContextInterface {
  constructor(private readonly ctxArgs: AccessControlContextArgsInterface) {}

  getContext(): PlainLiteralObject {
    return this.ctxArgs.ctx;
  }

  getActor(): AccessActor {
    return this.ctxArgs.query.actor;
  }

  getQuery(): AccessQueryInterface {
    return this.ctxArgs.query;
  }

  getAbility(): AccessAbility {
    return this.ctxArgs.ability;
  }

  getRequest(property?: string): unknown {
    const { request } = this.ctxArgs;

    if (!property) {
      return request;
    }

    return typeof request === 'object' && request !== null
      ? Reflect.get(request, property)
      : undefined;
  }

  getExecutionContext(): ExecutionContext {
    return this.ctxArgs.executionContext;
  }
}
