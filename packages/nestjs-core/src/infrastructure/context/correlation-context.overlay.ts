import { randomUUID } from 'node:crypto';

import { ExecutionContext, Injectable } from '@nestjs/common';

import { OverlayRef } from '../../domain/context/overlay-ref.js';

import { ContextOverlayInterceptor } from './context-overlay.interceptor.js';
import { getAppContext } from './get-app-context.util.js';
import { CorrelationContextInterface } from './interfaces/correlation-context.interface.js';

export const CorrelationCtx = new OverlayRef<
  'withCorrelation',
  CorrelationContextInterface
>('withCorrelation');

/**
 * Seeds the correlation/causation pair for the current request. A fresh
 * request has no causation ancestor, so `causationId` starts equal to
 * `correlationId` — the same self-correlated convention
 * {@link createCausalContext} falls back to when no overlay is present.
 */
@Injectable()
export class CorrelationContextOverlay extends ContextOverlayInterceptor {
  readonly ref = CorrelationCtx;

  attach(context: ExecutionContext): void {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const ctx = getAppContext(request);

    const header = request.headers['x-correlation-id'];
    const correlationId =
      (Array.isArray(header) ? header[0] : header) ?? randomUUID();

    ctx.defineOverlay(CorrelationCtx, {
      correlationId,
      causationId: correlationId,
    });
  }
}
