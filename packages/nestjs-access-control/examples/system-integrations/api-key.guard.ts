import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { ActorCtx, requireAppContext } from '@concepta/nestjs-core';

import { type DemoRequestInterface } from '../shared/demo-request.interface.js';

/**
 * Each partner's API key and the system it identifies. In a real
 * application, keys are hashed and stored, and compared in constant time.
 */
const SYSTEMS_BY_KEY: Record<string, string> = {
  'key-billing': 'billing',
  'key-crm': 'crm',
};

/**
 * Makes the partner system named by `x-api-key` the actor of the call. A
 * global guard runs before the route guard access control adds, and the
 * actor is defined immutably, so nothing later can change who is acting.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<DemoRequestInterface>();
    const key = request.headers['x-api-key'];
    const name = key === undefined ? undefined : SYSTEMS_BY_KEY[key];

    if (name) {
      requireAppContext(context).defineOverlay(
        ActorCtx,
        { kind: 'system', name },
        { immutable: true },
      );
    }

    return true;
  }
}
