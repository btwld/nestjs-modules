import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  ContextOverlayInterceptor,
  getAppContext,
  OverlayRef,
} from '@concepta/nestjs-core';

import {
  OTP_NAMESPACE_KEY,
  OtpNamespaceOptions,
} from './decorators/otp-namespace.decorator.js';
import { OtpContextInterface } from './interfaces/otp-context.interface.js';

export const OtpCtx = new OverlayRef<'withOtp', OtpContextInterface>('withOtp');

@Injectable()
export class OtpContextOverlay extends ContextOverlayInterceptor {
  readonly ref = OtpCtx;

  constructor(private readonly reflector: Reflector) {
    super();
  }

  attach(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest();
    const ctx = getAppContext(request);
    const resolved = this.resolve(context);
    ctx.defineOverlay(OtpCtx, resolved);
  }

  private resolve(context: ExecutionContext): OtpContextInterface {
    const options = this.reflector.getAllAndOverride<OtpNamespaceOptions>(
      OTP_NAMESPACE_KEY,
      [context.getHandler(), context.getClass()],
    );
    return { namespace: options?.name ?? '' };
  }
}
