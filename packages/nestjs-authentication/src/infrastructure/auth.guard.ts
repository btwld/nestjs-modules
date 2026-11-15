import { isObservable, lastValueFrom } from 'rxjs';

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

import { requireAppContext } from '@concepta/nestjs-core';

import {
  AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
  AUTHENTICATION_MODULE_OPTIONAL_AUTH_TOKEN,
} from '../authentication.constants.js';
import { type AuthenticatedUserInterface } from '../domain/interfaces/authenticated-user.interface.js';
import { GuardsPolicy } from '../domain/policies/guards.policy.js';
import { AuthUserCtx } from '../gateways/auth-user-context.overlay.js';

import { AuthGuardCtr, AuthGuardOptions } from './auth.guard.types.js';
import { AuthPublicMetadata } from './decorators/auth-public.decorator.js';
import { AuthTransportUnsupportedException } from './exceptions/auth-transport-unsupported.exception.js';
import { AuthUserConflictException } from './exceptions/auth-user-conflict.exception.js';
import { markAuthenticationGuard } from './utils/authentication-guard.util.js';
import { isHttpCall } from './utils/is-http-call.util.js';

/**
 * A Guard to use passport for express or fastify
 *
 * @example
 * ```ts
 * @UseGuards(AuthGuard('local'))
 * @Post('login')
 * async authenticateWithGuard(
 *   @AuthUser() user: LocalCredentialsInterface,
 * ): Promise<AuthenticationResponseInterface> {
 *
 *   const token = this.issueTokenService.issueAccessToken(user.username);
 *
 *   return {
 *     ...user,
 *     ...token,
 *   };
 * }
 * ```
 */
export const AuthGuard = (
  strategyName: string,
  options: AuthGuardOptions = { canDisable: false },
) => {
  // TODO: Add logic to get this information dynamically
  const isExpress = true;

  // the base class
  let AuthGuardBaseClass: AuthGuardCtr;

  if (isExpress) {
    AuthGuardBaseClass = PassportAuthGuard(strategyName);
  } else {
    AuthGuardBaseClass = FastifyAuthGuard(strategyName);
  }

  @Injectable()
  class AuthGuard extends AuthGuardBaseClass implements CanActivate {
    readonly options: AuthGuardOptions = {};

    constructor(
      @Inject(GuardsPolicy)
      public readonly guardsPolicy: GuardsPolicy,
      public readonly reflector: Reflector,
    ) {
      super(strategyName, options);
      this.options = options;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
      // does this guard allow disabling?
      if (this.options.canDisable === true) {
        // check if guards are enabled globally, default to true
        const enableGuards = this.guardsPolicy.enable;

        // guards are disabled globally?
        if (!enableGuards) {
          // yes, immediate activation
          return true;
        }

        // get the context handler and class
        const contextHandler = context.getHandler();
        const contextClass = context.getClass();

        // check if guards are disabled on the handler or class
        const handlerDisabled = this.reflector.get<AuthPublicMetadata>(
          AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
          contextHandler,
        );
        const classDisabled = this.reflector.get<AuthPublicMetadata>(
          AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN,
          contextClass,
        );

        // class-level @AuthPublic() without { classLevel: true } — warn on every request
        if (handlerDisabled === undefined && classDisabled === true) {
          process.emitWarning(
            '@AuthPublic() applied at class level disables authentication for ALL methods. ' +
              'Use @AuthPublic({ classLevel: true }) to suppress this warning.',
            { code: 'ROCKETS_AUTH_PUBLIC_CLASS_LEVEL' },
          );
        }

        const isDisabled = handlerDisabled ?? classDisabled;

        // disabled via context?
        if (isDisabled) {
          // optional authentication signs in a caller whose credentials
          // check out, and lets anyone else through as nobody
          if (
            this.reflector.getAllAndOverride<boolean | undefined>(
              AUTHENTICATION_MODULE_OPTIONAL_AUTH_TOKEN,
              [contextHandler, contextClass],
            ) === true
          ) {
            await authenticateIfValid(context, () =>
              super.canActivate(context),
            );
          }

          // yes, immediate activation
          return true;
        }

        // execute callback to determine if guard should be disabled
        const cbDisabled = this.guardsPolicy.disable(context, this);

        // disabled via callback?
        if (cbDisabled === true) {
          // yes, immediate activation
          return true;
        }
      }

      // call parent
      const activated = await activation(super.canActivate(context));

      if (activated) {
        defineAuthUser(context);
      }

      return activated;
    }

    /**
     * The request a strategy reads the credentials from: the HTTP request.
     * On any other transport the call is refused, since what it carries is
     * the caller's own payload. To authenticate another transport's calls,
     * override this to return that transport's request.
     */
    getRequest(context: ExecutionContext): unknown {
      if (!isHttpCall(context)) {
        throw new AuthTransportUnsupportedException(context.getType());
      }
      return context.switchToHttp().getRequest();
    }
  }

  markAuthenticationGuard(AuthGuard);

  return AuthGuard;
};

type Activation = ReturnType<CanActivate['canActivate']>;

async function activation(result: Activation): Promise<boolean> {
  return isObservable(result) ? lastValueFrom(result) : result;
}

/**
 * Authenticates the call when its credentials check out; a refusal (401)
 * leaves it anonymous, any other failure still fails the call. The
 * module's own guards report every authentication failure as a refusal,
 * a failing user lookup included, so with them any failure is anonymous.
 */
async function authenticateIfValid(
  context: ExecutionContext,
  authenticate: () => Activation,
): Promise<void> {
  let authenticated: boolean;

  try {
    authenticated = await activation(authenticate());
  } catch (error) {
    if (!(error instanceof HttpException) || error.getStatus() !== 401) {
      throw error;
    }
    return;
  }

  // Outside the try: a second user on the call is a refusal, not a reason
  // to go on as nobody.
  if (authenticated) {
    defineAuthUser(context);
  }
}

/**
 * Defines the authenticated user on the call's context as `AuthUserCtx`,
 * immutably, so guards that run after this one, such as access control,
 * can read it: interceptors, which define the other overlays, run after
 * every guard. The first guard to authenticate a call defines it; a later
 * one authenticating the same user changes nothing, and one authenticating
 * someone else refuses the call. Only on HTTP: a guard that authenticates
 * another transport, by overriding `getRequest`, defines nothing.
 */
function defineAuthUser(context: ExecutionContext): void {
  if (!isHttpCall(context)) {
    return;
  }

  const user = context
    .switchToHttp()
    .getRequest<{ user?: AuthenticatedUserInterface }>().user;

  if (!user) {
    return;
  }

  const ctx = requireAppContext(context);

  if (!ctx.supports(AuthUserCtx)) {
    ctx.defineOverlay(AuthUserCtx, { user }, { immutable: true });
    return;
  }

  // The same user only when both carry the same id: a user without one
  // can't be told apart from another, so it counts as someone else.
  const first = ctx.with(AuthUserCtx).user?.id;

  if (first === undefined || user.id === undefined || first !== user.id) {
    throw new AuthUserConflictException();
  }
}

export const FastifyAuthGuard = (_strategyName: string): AuthGuardCtr => {
  class FastifyAuthGuard implements CanActivate {
    canActivate(
      _context: ExecutionContext,
    ): ReturnType<CanActivate['canActivate']> {
      throw new NotImplementedException();
    }
  }

  return FastifyAuthGuard;
};
