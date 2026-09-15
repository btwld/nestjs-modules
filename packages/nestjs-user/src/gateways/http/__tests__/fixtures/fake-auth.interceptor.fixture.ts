import { Observable } from 'rxjs';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { UserEntityInterface } from '../../../../domain/interfaces/user-entity.interface.js';

@Injectable()
export class FakeAuthInterceptorFixture implements NestInterceptor {
  user: UserEntityInterface | undefined;

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    request.user = this.user;
    return next.handle();
  }
}
