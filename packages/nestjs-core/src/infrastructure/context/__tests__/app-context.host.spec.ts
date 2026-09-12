import { OverlayRef } from '../../../domain/context/overlay-ref.js';
import { AppContextHost } from '../app-context.host.js';

interface FeatureProps {
  value: string;
}

const FeatureRef = new OverlayRef<'withFeature', FeatureProps>('withFeature');

describe(AppContextHost.name, () => {
  describe('removeOverlay', () => {
    it('removes a defined overlay and clears supports()', () => {
      const ctx = new AppContextHost();
      ctx.defineOverlay(FeatureRef, { value: 'first' });

      expect(ctx.supports(FeatureRef)).toBe(true);

      const removed = ctx.removeOverlay(FeatureRef);

      expect(removed).toBe(true);
      expect(ctx.supports(FeatureRef)).toBe(false);
    });

    it('allows redefining an overlay after removal', () => {
      const ctx = new AppContextHost();
      ctx.defineOverlay(FeatureRef, { value: 'first' });
      ctx.removeOverlay(FeatureRef);

      ctx.defineOverlay(FeatureRef, { value: 'second' });

      expect(ctx.supports(FeatureRef)).toBe(true);
      expect(ctx.with(FeatureRef)).toEqual(
        expect.objectContaining({ value: 'second' }),
      );
    });

    it('does not remove an overlay inherited from a parent context', () => {
      const parent = new AppContextHost();
      parent.defineOverlay(FeatureRef, { value: 'parent' });
      const child = AppContextHost.from(parent.with(FeatureRef));

      const removed = child.removeOverlay(FeatureRef);

      expect(removed).toBe(false);
      expect(parent.supports(FeatureRef)).toBe(true);
      expect(child.supports(FeatureRef)).toBe(true);
    });

    it('is a no-op when the overlay was never defined', () => {
      const ctx = new AppContextHost();

      const removed = ctx.removeOverlay(FeatureRef);

      expect(removed).toBe(false);
      expect(ctx.supports(FeatureRef)).toBe(false);
    });
  });
});
