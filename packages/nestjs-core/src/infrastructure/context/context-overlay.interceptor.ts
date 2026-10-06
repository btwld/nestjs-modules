import { Observable } from 'rxjs';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PlainLiteralObject,
} from '@nestjs/common';

import { OverlayRef } from '../../domain/context/overlay-ref.js';

@Injectable()
export abstract class ContextOverlayInterceptor implements NestInterceptor {
  abstract readonly ref: OverlayRef<string, PlainLiteralObject, unknown[]>;
  abstract attach(context: ExecutionContext): void | Promise<void>;

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    await this.attach(context);
    return next.handle();
  }
}
