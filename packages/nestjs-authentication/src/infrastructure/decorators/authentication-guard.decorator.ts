import { markAuthenticationGuard } from '../utils/authentication-guard.util.js';

/**
 * Declares that a guard of your own authenticates the caller, so the
 * `requireAuth` route audit rule counts the routes it runs on, along with
 * those of its subclasses. Guards built with `AuthGuard()` need no
 * decorator.
 *
 * @example
 * ```ts
 * @Injectable()
 * @AuthenticationGuard()
 * export class ApiKeyGuard implements CanActivate {
 *   canActivate(context: ExecutionContext): boolean {
 *     // ...
 *   }
 * }
 * ```
 */
export const AuthenticationGuard =
  (): ClassDecorator =>
  (target): void => {
    markAuthenticationGuard(target);
  };
