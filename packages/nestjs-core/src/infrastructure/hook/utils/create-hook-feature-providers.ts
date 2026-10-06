import { type Provider, type Type } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { HookContextOverlay } from '../hook.context.overlay.js';
import { HookResolverService } from '../hook.resolver.service.js';

export function createHookFeatureProviders(): Provider[] {
  return [
    HookResolverService,
    HookContextOverlay,
    { provide: APP_INTERCEPTOR, useClass: HookContextOverlay },
  ];
}

export function createHookFeatureExports(): Type[] {
  return [HookResolverService, HookContextOverlay];
}
