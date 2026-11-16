import { type Provider, type Type } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { CorrelationContextOverlay } from '../correlation-context.overlay.js';

export function createCorrelationFeatureProviders(): Provider[] {
  return [
    CorrelationContextOverlay,
    { provide: APP_INTERCEPTOR, useClass: CorrelationContextOverlay },
  ];
}

export function createCorrelationFeatureExports(): Type[] {
  return [CorrelationContextOverlay];
}
