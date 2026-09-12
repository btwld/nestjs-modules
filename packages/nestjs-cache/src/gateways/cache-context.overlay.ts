import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  ContextOverlayInterceptor,
  getAppContext,
  OverlayRef,
} from '@concepta/nestjs-core';

import {
  CACHE_NAMESPACE_KEY,
  CacheNamespaceOptions,
} from './decorators/cache-namespace.decorator.js';
import { CacheContextInterface } from './interfaces/cache-context.interface.js';

export const CacheCtx = new OverlayRef<'withCache', CacheContextInterface>(
  'withCache',
);

@Injectable()
export class CacheContextOverlay extends ContextOverlayInterceptor {
  readonly ref = CacheCtx;

  constructor(private readonly reflector: Reflector) {
    super();
  }

  attach(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest();
    const ctx = getAppContext(request);
    const resolved = this.resolve(context);
    ctx.defineOverlay(CacheCtx, resolved);
  }

  private resolve(context: ExecutionContext): CacheContextInterface {
    const options = this.reflector.getAllAndOverride<CacheNamespaceOptions>(
      CACHE_NAMESPACE_KEY,
      [context.getHandler(), context.getClass()],
    );
    return { namespace: options?.name ?? '' };
  }
}
