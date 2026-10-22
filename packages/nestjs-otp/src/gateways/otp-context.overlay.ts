import { ContextType, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ContextOverlayInterceptor, OverlayRef } from '@concepta/nestjs-core';

import {
  OTP_NAMESPACE_KEY,
  OtpNamespaceOptions,
} from './decorators/otp-namespace.decorator.js';
import { OtpContextInterface } from './interfaces/otp-context.interface.js';

export const OtpCtx = new OverlayRef<'withOtp', OtpContextInterface>('withOtp');

@Injectable()
export class OtpContextOverlay extends ContextOverlayInterceptor {
  readonly ref = OtpCtx;
  readonly transports: readonly ContextType[] = ['http', 'rpc'];

  constructor(private readonly reflector: Reflector) {
    super();
  }

  attach(context: ExecutionContext): void {
    this.appContext(context).defineOverlay(OtpCtx, this.resolve(context));
  }

  private resolve(context: ExecutionContext): OtpContextInterface {
    const options = this.reflector.getAllAndOverride<OtpNamespaceOptions>(
      OTP_NAMESPACE_KEY,
      [context.getHandler(), context.getClass()],
    );
    return { namespace: options?.name ?? '' };
  }
}
