import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { type DemoRequestInterface } from './demo-request.interface.js';

/**
 * Stands in for your authentication. `Authorization: Bearer <user id>`
 * puts that user on the request, as a JWT or session guard does once it has
 * verified a token. A real application never takes a user id from the
 * client like this.
 *
 * Register it as a global guard (`APP_GUARD`): global guards run before the
 * route guard access control adds, so the user is on the request in time.
 */
@Injectable()
export class DemoAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<DemoRequestInterface>();
    const [scheme, id] = (request.headers.authorization ?? '').split(' ');

    if (scheme === 'Bearer' && id) {
      request.user = { id };
    }

    return true;
  }
}
