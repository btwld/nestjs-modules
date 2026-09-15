import {
  type CausalContextResolver,
  type CausalPairInterface,
} from '../causal-context-resolver.interface.js';
import { createCausalContext } from '../create-causal-context.js';

class MockCausalContextResolver implements CausalContextResolver {
  private pair: CausalPairInterface | undefined;
  memoizeCalls: CausalPairInterface[] = [];

  constructor(pair?: CausalPairInterface) {
    this.pair = pair;
  }

  resolve(): CausalPairInterface | undefined {
    return this.pair;
  }

  memoize(pair: CausalPairInterface): void {
    this.memoizeCalls.push(pair);
    this.pair = pair;
  }
}

describe(createCausalContext.name, () => {
  it('uses the resolver pair when one is already established', () => {
    const resolver = new MockCausalContextResolver({
      correlationId: 'corr-1',
      causationId: 'cause-1',
    });

    const eventContext = createCausalContext(resolver, {}, {});

    expect(eventContext.getHeader('correlationId')).toBe('corr-1');
    expect(eventContext.getHeader('causationId')).toBe('cause-1');
    expect(resolver.memoizeCalls).toHaveLength(0);
  });

  it('mints and memoizes a self-correlated pair when no pair is resolvable', () => {
    const resolver = new MockCausalContextResolver();

    const eventContext = createCausalContext(resolver, {}, {});

    const correlationId = eventContext.getHeader('correlationId');
    const causationId = eventContext.getHeader('causationId');

    expect(correlationId).toBe(causationId);
    expect(resolver.memoizeCalls).toEqual([{ correlationId, causationId }]);
  });

  it('populates recordedAt at construction time', () => {
    const resolver = new MockCausalContextResolver({
      correlationId: 'corr-1',
      causationId: 'cause-1',
    });

    const before = new Date();
    const eventContext = createCausalContext(resolver, {}, {});
    const after = new Date();

    const recordedAt = eventContext.getHeader('recordedAt');
    expect(recordedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(recordedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('carries caller-supplied extra headers alongside the causal fields', () => {
    const resolver = new MockCausalContextResolver({
      correlationId: 'corr-1',
      causationId: 'cause-1',
    });

    const eventContext = createCausalContext(
      resolver,
      { namespace: 'my-namespace' },
      {},
    );

    expect(eventContext.getHeader('namespace')).toBe('my-namespace');
    expect(eventContext.getHeader('correlationId')).toBe('corr-1');
  });

  it('carries caller-supplied metadata', () => {
    const resolver = new MockCausalContextResolver({
      correlationId: 'corr-1',
      causationId: 'cause-1',
    });

    const eventContext = createCausalContext(
      resolver,
      {},
      { passcode: 'abc123' },
    );

    expect(eventContext.getMeta('passcode')).toBe('abc123');
  });
});
