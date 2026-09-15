import { AppContextHost } from '../../../infrastructure/context/app-context.host.js';
import { CorrelationCtx } from '../../../infrastructure/context/correlation-context.overlay.js';
import { AppContextHostCausalResolver } from '../app-context-host-causal-resolver.js';

describe(AppContextHostCausalResolver.name, () => {
  describe('resolve', () => {
    it('returns undefined when no CorrelationCtx overlay is defined', () => {
      const appCtx = new AppContextHost();
      const resolver = new AppContextHostCausalResolver(appCtx);

      expect(resolver.resolve()).toBeUndefined();
    });

    it('returns the pair from a defined CorrelationCtx overlay', () => {
      const appCtx = new AppContextHost();
      appCtx.defineOverlay(CorrelationCtx, {
        correlationId: 'corr-1',
        causationId: 'cause-1',
      });
      const resolver = new AppContextHostCausalResolver(appCtx);

      expect(resolver.resolve()).toEqual({
        correlationId: 'corr-1',
        causationId: 'cause-1',
      });
    });
  });

  describe('memoize', () => {
    it('defines the CorrelationCtx overlay so a later resolve sees it', () => {
      const appCtx = new AppContextHost();
      const resolver = new AppContextHostCausalResolver(appCtx);

      resolver.memoize({ correlationId: 'corr-1', causationId: 'cause-1' });

      expect(resolver.resolve()).toEqual({
        correlationId: 'corr-1',
        causationId: 'cause-1',
      });
    });
  });
});
