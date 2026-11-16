import { ContextType, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ContextOverlayInterceptor, OverlayRef } from '@concepta/nestjs-core';

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
  readonly transports: readonly ContextType[] = ['http', 'rpc'];

  constructor(private readonly reflector: Reflector) {
    super();
  }

  attach(context: ExecutionContext): void {
    this.appContext(context).defineOverlay(CacheCtx, this.resolve(context));
  }

  private resolve(context: ExecutionContext): CacheContextInterface {
    const options = this.reflector.getAllAndOverride<CacheNamespaceOptions>(
      CACHE_NAMESPACE_KEY,
      [context.getHandler(), context.getClass()],
    );
    return { namespace: options?.name ?? '' };
  }
}
