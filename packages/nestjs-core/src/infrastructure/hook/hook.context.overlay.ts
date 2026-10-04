import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { OverlayRef } from '../../domain/context/overlay-ref.js';
import { ContextOverlayInterceptor } from '../context/context-overlay.interceptor.js';
import { getAppContext } from '../context/get-app-context.util.js';
import { HookContextInterface } from '../context/interfaces/hook-context.interface.js';

import { HOOKS_METADATA_KEY } from './hook.constants.js';
import { HookOption } from './hook.types.js';
import { normalizeHookOption } from './utils/normalize-hook-option.js';

export const HooksCtx = new OverlayRef<'withHooks', HookContextInterface>(
  'withHooks',
);

@Injectable()
export class HookContextOverlay extends ContextOverlayInterceptor {
  readonly ref = HooksCtx;

  constructor(private readonly reflector: Reflector) {
    super();
  }

  attach(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest();
    const ctx = getAppContext(request);
    const resolved = this.resolve(context);
    ctx.defineOverlay(HooksCtx, resolved);
  }

  private resolve(context: ExecutionContext): HookContextInterface {
    const decoratorHooks = this.reflector.getAllAndMerge<HookOption[]>(
      HOOKS_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    return { hooks: (decoratorHooks ?? []).map(normalizeHookOption) };
  }
}
