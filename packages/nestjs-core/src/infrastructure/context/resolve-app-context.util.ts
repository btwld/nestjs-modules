import { type ExecutionContext } from '@nestjs/common';

import { AppContextHost } from './app-context.host.js';
import { AppContextUnavailableException } from './exceptions/app-context-unavailable.exception.js';
import { getAppContext } from './get-app-context.util.js';

/**
 * RPC contexts, keyed by the transport's per-call context object and then by
 * handler. Two `@EventPattern` handlers for one event receive the same
 * context object, so the handler key keeps each one's overlays its own. A
 * `WeakMap` leaves the transport's object untouched and lets the entry go
 * with it.
 */
const rpcContexts = new WeakMap<object, Map<unknown, AppContextHost>>();

function findRpcContext(context: ExecutionContext): AppContextHost | undefined {
  const carrier = context.switchToRpc().getContext<unknown>();

  // gRPC call-stream handlers receive a callback or nothing here.
  if (typeof carrier !== 'object' || carrier === null) {
    return undefined;
  }

  const byHandler =
    rpcContexts.get(carrier) ?? new Map<unknown, AppContextHost>();
  rpcContexts.set(carrier, byHandler);

  const handler = context.getHandler();
  const ctx = byHandler.get(handler) ?? new AppContextHost();
  byHandler.set(handler, ctx);

  return ctx;
}

/**
 * The application context for one call, created on first access.
 *
 * Every interceptor, guard and parameter decorator handling the same call
 * gets the same context; the next call gets a new one, as long as the
 * transport hands each call its own context object (every built-in Nest
 * transport does). Returns `undefined`
 * on a transport with no per-call context: WebSocket, and gRPC call-stream
 * handlers.
 */
export function findAppContext(
  context: ExecutionContext,
): AppContextHost | undefined {
  switch (context.getType()) {
    case 'http':
      return getAppContext(context.switchToHttp().getRequest());
    case 'rpc':
      return findRpcContext(context);
    default:
      return undefined;
  }
}

/**
 * Like {@link findAppContext}, but throws
 * {@link AppContextUnavailableException} when the call has no context.
 */
export function requireAppContext(context: ExecutionContext): AppContextHost {
  const ctx = findAppContext(context);

  if (!ctx) {
    throw new AppContextUnavailableException(context.getType());
  }

  return ctx;
}
