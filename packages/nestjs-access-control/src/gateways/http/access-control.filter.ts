import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { ACCESS_CONTROL_PORT_TOKEN } from '../../access-control.constants.js';
import { AccessControlPort } from '../../application/ports/access-control.port.js';

@Injectable()
export class AccessControlFilter implements NestInterceptor {
  constructor(
    @Inject(ACCESS_CONTROL_PORT_TOKEN)
    private readonly accessControlPort: AccessControlPort,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(
        mergeMap((data) =>
          from(this.accessControlPort.filterResponseAttributes(context, data)),
        ),
      );
  }
}
