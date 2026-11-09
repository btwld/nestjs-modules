import { of } from 'rxjs';

import { type ContextType, type ExecutionContext } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';

import { OverlayRef } from '../../../domain/context/overlay-ref.js';
import { APP_CONTEXT_KEY, AppContextHost } from '../app-context.host.js';
import { ContextOverlayInterceptor } from '../context-overlay.interceptor.js';
import { AppContextUnavailableException } from '../exceptions/app-context-unavailable.exception.js';
import { OverlayNotDefinedException } from '../exceptions/overlay-not-defined.exception.js';
import { getAppContext } from '../get-app-context.util.js';
import {
  findAppContext,
  requireAppContext,
} from '../resolve-app-context.util.js';

class Handlers {
  first(): void {
    return;
  }
  second(): void {
    return;
  }
}

function makeContext(
  type: ContextType,
  args: unknown[],
  handler: () => void = Handlers.prototype.first,
): ExecutionContext {
  const host = new ExecutionContextHost(args, Handlers, handler);
  host.setType(type);
  return host;
}

const ProbeCtx = new OverlayRef<'withProbe', { handler: string }>('withProbe');

class ProbeOverlay extends ContextOverlayInterceptor {
  readonly ref = ProbeCtx;

  constructor(readonly transports: readonly ContextType[]) {
    super();
  }

  attach(context: ExecutionContext): void {
    this.appContext(context).defineOverlay(ProbeCtx, {
      handler: context.getHandler().name,
    });
  }
}

const next = { handle: () => of(null) };

describe('findAppContext', () => {
  it('should use the request on HTTP', () => {
    const request = {};

    expect(findAppContext(makeContext('http', [request]))).toBe(
      getAppContext(request),
    );
  });

  it('should give every lookup on one RPC call the same context', () => {
    const carrier = {};

    expect(findAppContext(makeContext('rpc', [null, carrier]))).toBe(
      findAppContext(makeContext('rpc', [null, carrier])),
    );
  });

  it('should give each RPC call its own context', () => {
    expect(findAppContext(makeContext('rpc', [null, {}]))).not.toBe(
      findAppContext(makeContext('rpc', [null, {}])),
    );
  });

  it('should give two handlers of one RPC event their own contexts', () => {
    const carrier = {};

    expect(
      findAppContext(
        makeContext('rpc', [null, carrier], Handlers.prototype.first),
      ),
    ).not.toBe(
      findAppContext(
        makeContext('rpc', [null, carrier], Handlers.prototype.second),
      ),
    );
  });

  it('should leave the RPC context object untouched', () => {
    const carrier = {};
    findAppContext(makeContext('rpc', [null, carrier]));

    expect(Reflect.ownKeys(carrier)).toEqual([]);
  });

  it.each([
    ['a gRPC call-stream callback', () => undefined],
    ['nothing', undefined],
  ])('should find no context on RPC when it receives %s', (_label, carrier) => {
    expect(findAppContext(makeContext('rpc', [{}, carrier]))).toBeUndefined();
  });

  it('should find no context on WebSocket', () => {
    expect(findAppContext(makeContext('ws', [{}, {}]))).toBeUndefined();
  });
});

describe('requireAppContext', () => {
  it('should return the context when there is one', () => {
    expect(requireAppContext(makeContext('rpc', [null, {}]))).toBeInstanceOf(
      AppContextHost,
    );
  });

  it('should throw on WebSocket', () => {
    expect(() => requireAppContext(makeContext('ws', [{}, {}]))).toThrow(
      AppContextUnavailableException,
    );
  });
});

describe('ContextOverlayInterceptor', () => {
  it('should attach on HTTP by default', async () => {
    const request = {};
    await new ProbeOverlay(['http']).intercept(
      makeContext('http', [request]),
      next,
    );

    expect(getAppContext(request).with(ProbeCtx)).toEqual({
      handler: 'first',
    });
  });

  it('should skip a transport it does not list', async () => {
    const carrier = {};
    await new ProbeOverlay(['http']).intercept(
      makeContext('rpc', [null, carrier]),
      next,
    );

    expect(() =>
      findAppContext(makeContext('rpc', [null, carrier]))?.with(ProbeCtx),
    ).toThrow(OverlayNotDefinedException);
  });

  it('should attach on RPC when it lists it', async () => {
    const carrier = {};
    await new ProbeOverlay(['http', 'rpc']).intercept(
      makeContext('rpc', [null, carrier]),
      next,
    );

    expect(
      findAppContext(makeContext('rpc', [null, carrier]))?.with(ProbeCtx),
    ).toEqual({ handler: 'first' });
  });

  it('should keep each RPC handler to its own overlays', async () => {
    const carrier = {};
    await new ProbeOverlay(['rpc']).intercept(
      makeContext('rpc', [null, carrier], Handlers.prototype.first),
      next,
    );

    expect(() =>
      findAppContext(
        makeContext('rpc', [null, carrier], Handlers.prototype.second),
      )?.with(ProbeCtx),
    ).toThrow(OverlayNotDefinedException);
  });

  it('should leave a WebSocket client untouched', async () => {
    const client = {};
    await new ProbeOverlay(['http', 'rpc', 'ws']).intercept(
      makeContext('ws', [client, {}]),
      next,
    );

    expect(APP_CONTEXT_KEY in client).toBe(false);
  });
});
