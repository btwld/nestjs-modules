import { type AppContextHost } from '../../infrastructure/context/app-context.host.js';
import { CorrelationCtx } from '../../infrastructure/context/correlation-context.overlay.js';

import {
  type CausalContextResolver,
  type CausalPairInterface,
} from './causal-context/causal-context-resolver.interface.js';

/**
 * Reads the correlation/causation pair from an {@link AppContextHost}'s
 * `CorrelationCtx` overlay, and memoizes a synthesized pair back onto it
 * when none is present yet.
 */
export class AppContextHostCausalResolver implements CausalContextResolver {
  constructor(private readonly appCtx: AppContextHost) {}

  resolve(): CausalPairInterface | undefined {
    if (!this.appCtx.supports(CorrelationCtx)) return undefined;
    const { correlationId, causationId } = this.appCtx.with(CorrelationCtx);
    return { correlationId, causationId };
  }

  memoize(pair: CausalPairInterface): void {
    this.appCtx.defineOverlay(CorrelationCtx, pair);
  }
}
