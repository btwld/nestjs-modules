import { OverlayRef } from '../../../domain/context/overlay-ref.js';
import { AppContextHost } from '../app-context.host.js';
import { OverlayAlreadyDefinedException } from '../exceptions/overlay-already-defined.exception.js';
import { OverlayImmutableException } from '../exceptions/overlay-immutable.exception.js';
import { OverlayNotDefinedException } from '../exceptions/overlay-not-defined.exception.js';

interface FeatureProps {
  value: string;
}

interface OtherProps {
  label: string;
}

const FeatureRef = new OverlayRef<'withFeature', FeatureProps>('withFeature');
const OtherRef = new OverlayRef<'withOther', OtherProps>('withOther');

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

  describe('immutable overlays', () => {
    const define = (ctx: AppContextHost, value: string) =>
      ctx.defineOverlay(FeatureRef, { value }, { immutable: true });

    it('reads back like any other overlay', () => {
      const ctx = new AppContextHost();
      define(ctx, 'first');

      expect(ctx.supports(FeatureRef)).toBe(true);
      expect(ctx.with(FeatureRef).value).toEqual('first');
    });

    it('refuses a second definition instead of silently ignoring it', () => {
      const ctx = new AppContextHost();
      define(ctx, 'first');

      expect(() => define(ctx, 'second')).toThrow(OverlayImmutableException);
      expect(ctx.with(FeatureRef).value).toEqual('first');
    });

    it('refuses a mutable redefinition too', () => {
      const ctx = new AppContextHost();
      define(ctx, 'first');

      expect(() => ctx.defineOverlay(FeatureRef, { value: 'second' })).toThrow(
        OverlayImmutableException,
      );
    });

    it('cannot be removed and redefined', () => {
      const ctx = new AppContextHost();
      define(ctx, 'first');

      expect(ctx.removeOverlay(FeatureRef)).toBe(false);
      expect(ctx.supports(FeatureRef)).toBe(true);
      expect(() => define(ctx, 'second')).toThrow(OverlayImmutableException);
    });

    it('refuses to be shadowed on a prototype child', () => {
      const parent = new AppContextHost();
      define(parent, 'parent');
      const child = AppContextHost.from(parent.with(FeatureRef));

      expect(() => define(child, 'child')).toThrow(OverlayImmutableException);
      expect(child.with(FeatureRef).value).toEqual('parent');
    });

    it('does not freeze the caller own values object', () => {
      const ctx = new AppContextHost();
      const values = { value: 'first' };

      ctx.defineOverlay(FeatureRef, values, { immutable: true });

      expect(Object.isFrozen(values)).toBe(false);
    });

    it('refuses to harden an overlay that is already defined mutably', () => {
      const ctx = new AppContextHost();
      ctx.defineOverlay(FeatureRef, { value: 'first' });

      // Silently ignoring this would leave the caller believing it hardened
      // an overlay that is still removable and shadowable.
      expect(() => define(ctx, 'second')).toThrow(
        OverlayAlreadyDefinedException,
      );
      expect(ctx.removeOverlay(FeatureRef)).toBe(true);
    });

    it('ignores mutation of the values object after definition', () => {
      const ctx = new AppContextHost();
      const values = { value: 'first' };
      ctx.defineOverlay(FeatureRef, values, { immutable: true });

      values.value = 'tampered';

      expect(ctx.with(FeatureRef).value).toEqual('first');
    });
  });

  describe('mutable overlays keep their existing behavior', () => {
    it('still shadows on a prototype child', () => {
      const parent = new AppContextHost();
      parent.defineOverlay(FeatureRef, { value: 'parent' });
      const child = AppContextHost.from(parent.with(FeatureRef));

      child.defineOverlay(FeatureRef, { value: 'child' });

      expect(child.with(FeatureRef).value).toEqual('child');
      expect(parent.with(FeatureRef).value).toEqual('parent');
    });

    it('is still an idempotent no-op on the same context', () => {
      const ctx = new AppContextHost();
      ctx.defineOverlay(FeatureRef, { value: 'first' });

      ctx.defineOverlay(FeatureRef, { value: 'second' });

      expect(ctx.with(FeatureRef).value).toEqual('first');
    });
  });

  describe('require', () => {
    it('refuses an overlay that is not defined', () => {
      const ctx = new AppContextHost();

      expect(() => ctx.require(FeatureRef)).toThrow(OverlayNotDefinedException);
    });

    it('names the first absent overlay when several are given', () => {
      const ctx = new AppContextHost();
      ctx.defineOverlay(FeatureRef, { value: 'present' });

      expect(() => ctx.require(FeatureRef, OtherRef)).toThrow(/"withOther"/);
    });

    it('reads the overlay when it is defined', () => {
      const ctx = new AppContextHost();
      ctx.defineOverlay(FeatureRef, { value: 'present' });

      expect(ctx.require(FeatureRef).withFeature().value).toEqual('present');
    });

    // `RepositoryAdapter.entityCtx` builds its context as a prototype child of
    // the caller's, so an overlay the caller supplied is never an own property
    // by the time a hook reads it. A presence check on own properties only
    // would refuse every real request.
    it('accepts an overlay inherited from a parent context', () => {
      const parent = new AppContextHost();
      parent.defineOverlay(FeatureRef, { value: 'from-parent' });
      const child = AppContextHost.from(parent.with(FeatureRef));

      expect(child.require(FeatureRef).withFeature().value).toEqual(
        'from-parent',
      );
    });
  });

  describe('optional', () => {
    it('resolves the overlay when it is defined', () => {
      const ctx = new AppContextHost();
      ctx.defineOverlay(FeatureRef, { value: 'present' });

      const resolved = ctx.optional().withFeature();

      expect(AppContextHost.from(resolved).with(FeatureRef).value).toEqual(
        'present',
      );
    });

    it('returns the context unchanged for an overlay that is absent', () => {
      const ctx = new AppContextHost();

      expect(ctx.optional().withFeature()).toBe(ctx);
    });

    // A proxy that answers every property with a callable reports a callable
    // `then`, which makes it a thenable — so awaiting it hands the runtime a
    // `then` that resolves nothing and the await never settles.
    it('is not a thenable', async () => {
      const ctx = new AppContextHost();

      await expect(
        Promise.race([
          Promise.resolve(ctx.optional()),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('await never settled')), 100),
          ),
        ]),
      ).resolves.toBeDefined();
    });

    // Chaining past two absent overlays is the shape `entityCtx` uses, and the
    // reason `optional()` returns the host rather than the overlay's props.
    it('keeps chaining when an earlier overlay in the chain is absent', () => {
      const ctx = new AppContextHost();
      ctx.defineOverlay(OtherRef, { label: 'reached' });

      const chained = ctx.optional().withFeature();
      const reached = AppContextHost.from(chained).optional().withOther();

      expect(AppContextHost.from(reached).with(OtherRef).label).toEqual(
        'reached',
      );
    });
  });
});
