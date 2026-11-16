import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

import { firstValueFrom } from 'rxjs';

import {
  Controller,
  type ContextType,
  type ExecutionContext,
  type INestMicroservice,
  Injectable,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  ClientProxyFactory,
  type ClientProxy,
  EventPattern,
  MessagePattern,
  Payload,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import { CoreModule } from '../../../core.module.js';
import { OverlayRef } from '../../../domain/context/overlay-ref.js';
import { Hook } from '../../hook/decorators/hook.decorator.js';
import { UseHooks } from '../../hook/decorators/use-hooks.decorator.js';
import { HooksCtx } from '../../hook/hook.context.overlay.js';
import { type AppContextHost } from '../app-context.host.js';
import { ContextOverlayInterceptor } from '../context-overlay.interceptor.js';
import { Ctx } from '../ctx.decorator.js';

@Hook({ type: 'rpc-probe' })
class ProbeHook {}

const ProbeCtx = new OverlayRef<'withProbe', { pattern: string }>('withProbe');

/** An implementer's own overlay, attached on RPC only. */
@Injectable()
class RpcProbeOverlay extends ContextOverlayInterceptor {
  readonly ref = ProbeCtx;
  readonly transports: readonly ContextType[] = ['rpc'];

  attach(context: ExecutionContext): void {
    this.appContext(context).defineOverlay(ProbeCtx, {
      pattern: context.getHandler().name,
    });
  }
}

/** Defined by the `hooked` handler itself, so no overlay can overwrite it. */
const MarkerCtx = new OverlayRef<'withMarker', { set: true }>('withMarker');

// -1 when a previous call's context leaked into this one.
const hookCount = (ctx: AppContextHost): number =>
  ctx.supports(MarkerCtx) ? -1 : ctx.with(HooksCtx).hooks.length;

const events: Record<string, number> = {};

@Controller()
class RpcController {
  @UseHooks(ProbeHook)
  @MessagePattern('hooked')
  async hooked(
    @Payload() delay: number,
    @Ctx() ctx: AppContextHost,
  ): Promise<number> {
    await sleep(delay);
    const count = hookCount(ctx);
    ctx.defineOverlay(MarkerCtx, { set: true });
    return count;
  }

  @MessagePattern('plain')
  async plain(
    @Payload() delay: number,
    @Ctx() ctx: AppContextHost,
  ): Promise<number> {
    await sleep(delay);
    return hookCount(ctx);
  }

  @MessagePattern('probe')
  probe(@Ctx(ProbeCtx) probe: { pattern: string }): string {
    return probe.pattern;
  }

  @UseHooks(ProbeHook)
  @EventPattern('event')
  hookedEvent(@Ctx() ctx: AppContextHost): void {
    events.hookedEvent = hookCount(ctx);
  }

  @EventPattern('event')
  plainEvent(@Ctx() ctx: AppContextHost): void {
    events.plainEvent = hookCount(ctx);
  }
}

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  await new Promise((resolve) => server.close(resolve));
  if (address === null || typeof address === 'string') {
    throw new Error('no TCP port');
  }
  return address.port;
}

describe('Request context over RPC (TCP)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;

  beforeAll(async () => {
    const port = await freePort();

    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule.forRoot()],
      controllers: [RpcController],
      providers: [{ provide: APP_INTERCEPTOR, useClass: RpcProbeOverlay }],
    }).compile();

    app = moduleRef.createNestMicroservice({
      transport: Transport.TCP,
      options: { port },
    });
    await app.listen();

    client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { port },
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.close();
    await app.close();
  });

  // A primitive payload, which the request-keyed lookup used to crash on.
  const send = (pattern: string, delay = 0): Promise<unknown> =>
    firstValueFrom(client.send(pattern, delay));

  it("should apply a handler's @UseHooks to its own call", async () => {
    expect(await send('hooked')).toBe(1);
  });

  it('should give the next call on the same connection a fresh context', async () => {
    await send('hooked');

    expect(await send('hooked')).toBe(1);
  });

  it('should keep concurrent calls on one connection apart', async () => {
    const results = await Promise.all([
      send('hooked', 30),
      send('plain', 10),
      send('hooked', 10),
      send('plain', 30),
    ]);

    expect(results).toEqual([1, 0, 1, 0]);
  });

  it("should hand @Ctx() the overlay an implementer's RPC overlay attached", async () => {
    expect(await send('probe')).toBe('probe');
  });

  it('should give two handlers of one event their own hooks', async () => {
    await firstValueFrom(client.emit('event', 0));
    await vi.waitFor(() => {
      expect(events).toEqual({ hookedEvent: 1, plainEvent: 0 });
    });
  });
});
