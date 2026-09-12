import { AppContextHost, APP_CONTEXT_KEY } from './app-context.host.js';

/**
 * Get or create the application context for a request.
 *
 * Creates a new context on first access; subsequent calls return the same instance.
 * Typically used by interceptors to define overlays on the context.
 *
 * @example
 * ```typescript
 * // In an overlay's attach() method
 * const ctx = getAppContext(request);
 * ctx.defineOverlay(this.ref, resolvedValues);
 * ```
 */
export function getAppContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: any,
): AppContextHost {
  if (!request[APP_CONTEXT_KEY]) {
    request[APP_CONTEXT_KEY] = new AppContextHost();
  }
  return request[APP_CONTEXT_KEY];
}
