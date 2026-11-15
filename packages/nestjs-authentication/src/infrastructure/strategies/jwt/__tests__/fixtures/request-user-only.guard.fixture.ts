import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/** The user a guard of the implementer's own signs in. */
export const OWN_GUARD_USER = { id: 'own-guard-user-id' };

/**
 * A guard of the implementer's own that authenticates by setting only
 * `request.user`, leaving `AuthUserCtx` to the overlay.
 */
@Injectable()
export class RequestUserOnlyGuardFixture implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest<{ user?: object }>().user =
      OWN_GUARD_USER;
    return true;
  }
}
