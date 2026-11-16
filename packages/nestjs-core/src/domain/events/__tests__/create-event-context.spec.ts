import { AppContextHost } from '../../../infrastructure/context/app-context.host.js';
import { CorrelationCtx } from '../../../infrastructure/context/correlation-context.overlay.js';
import { createEventContext } from '../create-event-context.js';

describe(createEventContext.name, () => {
  it('derives correlationId/causationId from an already-seeded CorrelationCtx overlay', () => {
    const appCtx = new AppContextHost();
    appCtx.defineOverlay(CorrelationCtx, {
      correlationId: 'corr-1',
      causationId: 'cause-1',
    });

    const eventContext = createEventContext(appCtx, {}, {});

    expect(eventContext.getHeader('correlationId')).toBe('corr-1');
    expect(eventContext.getHeader('causationId')).toBe('cause-1');
  });

  it('mints a self-correlated pair when ctx has no CorrelationCtx overlay', () => {
    const appCtx = new AppContextHost();

    const eventContext = createEventContext(appCtx, {}, {});

    const correlationId = eventContext.getHeader('correlationId');
    const causationId = eventContext.getHeader('causationId');
    expect(correlationId).toBe(causationId);
  });

  it('never throws on a plain empty object ctx', () => {
    expect(() => createEventContext({}, {}, {})).not.toThrow();
  });

  it('never throws on an unusual non-empty, non-AppContextHost ctx', () => {
    expect(() =>
      createEventContext({ someUnrelatedField: 'x' }, {}, {}),
    ).not.toThrow();
  });

  it('degrades to the synthetic-fallback path when ctx is unusual', () => {
    const eventContext = createEventContext(
      { someUnrelatedField: 'x' },
      {},
      {},
    );

    const correlationId = eventContext.getHeader('correlationId');
    const causationId = eventContext.getHeader('causationId');
    expect(correlationId).toBe(causationId);
  });

  it('carries caller-supplied extra headers and metadata', () => {
    const appCtx = new AppContextHost();

    const eventContext = createEventContext(
      appCtx,
      { namespace: 'my-namespace' },
      { passcode: 'abc123' },
    );

    expect(eventContext.getHeader('namespace')).toBe('my-namespace');
    expect(eventContext.getMeta('passcode')).toBe('abc123');
  });
});
