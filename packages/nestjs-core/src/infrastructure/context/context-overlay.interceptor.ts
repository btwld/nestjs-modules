import { Observable } from 'rxjs';

import {
  CallHandler,
  ContextType,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PlainLiteralObject,
} from '@nestjs/common';

import { OverlayRef } from '../../domain/context/overlay-ref.js';

import { AppContextHost } from './app-context.host.js';
import {
  findAppContext,
  requireAppContext,
} from './resolve-app-context.util.js';

@Injectable()
export abstract class ContextOverlayInterceptor implements NestInterceptor {
  abstract readonly ref: OverlayRef<string, PlainLiteralObject, unknown[]>;

  /**
   * The transports this overlay attaches on. On any other transport the call
   * proceeds without it. RPC support is in preview.
   */
  readonly transports: readonly ContextType[] = ['http'];

  /**
   * Defines this overlay on the current call's context, which
   * {@link appContext} returns.
   */
  abstract attach(context: ExecutionContext): void | Promise<void>;

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (
      this.transports.includes(context.getType()) &&
      findAppContext(context)
    ) {
      await this.attach(context);
    }
    return next.handle();
  }

  /**
   * The context for the current call. Every overlay on the same call gets
   * the same one.
   */
  protected appContext(context: ExecutionContext): AppContextHost {
    return requireAppContext(context);
  }
}
