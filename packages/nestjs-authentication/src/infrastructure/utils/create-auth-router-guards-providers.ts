import { type CanActivate, type Provider, type Type } from '@nestjs/common';

import { AuthRouterGuards } from '../router/auth-router.constants.js';
import { type AuthRouterGuardsRecord } from '../router/auth-router.types.js';
import { type AuthRouterGuardConfigInterface } from '../router/interfaces/auth-router-guard-config.interface.js';

export function createAuthRouterGuardsProviders(
  guards: AuthRouterGuardConfigInterface[],
): Provider[] {
  const guardsToInject: Type<CanActivate>[] = [];
  const providerTracker: Record<string, number> = {};

  let guardIdx = 0;
  for (const guardConfig of guards) {
    guardsToInject[guardIdx] = guardConfig.guard;
    providerTracker[guardConfig.name] = guardIdx++;
  }

  return [
    // Register each guard class as a provider
    ...guardsToInject,
    // Create the guards record
    {
      provide: AuthRouterGuards,
      inject: guardsToInject,
      useFactory: (...args: CanActivate[]): AuthRouterGuardsRecord => {
        const guardInstances: AuthRouterGuardsRecord = {};
        for (const guardConfig of guards) {
          guardInstances[guardConfig.name] =
            args[providerTracker[guardConfig.name]];
        }
        return guardInstances;
      },
    },
  ];
}
