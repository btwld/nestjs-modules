import {
  createParamDecorator,
  type ExecutionContext,
  type PlainLiteralObject,
} from '@nestjs/common';

import { type OverlayRef } from '../../domain/context/overlay-ref.js';

import { requireAppContext } from './resolve-app-context.util.js';

/**
 * Parameter decorator to inject the per-request application context.
 *
 * Works on HTTP and, in preview, on RPC. Throws
 * `AppContextUnavailableException` on WebSocket and in gRPC call-stream
 * handlers.
 *
 * When called without arguments, returns the raw `AppContextHost`.
 * When called with an `OverlayRef`, unwraps the overlay via `appCtx.with(ref)`.
 *
 * @example
 * ```typescript
 * // Raw context
 * @Get()
 * handle(@Ctx() ctx: AppContextHost) { ... }
 *
 * // Unwrapped overlay
 * @Get()
 * handle(@Ctx(MyOverlayRef) overlay: MyOverlayInterface) { ... }
 * ```
 */
export const Ctx = createParamDecorator(
  (
    ref: OverlayRef<string, PlainLiteralObject, unknown[]> | undefined,
    ctx: ExecutionContext,
  ) => {
    const appCtx = requireAppContext(ctx);
    return ref ? appCtx.with(ref) : appCtx;
  },
);
