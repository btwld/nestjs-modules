import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

import { AUTHENTICATION_MODULE_DISABLE_GUARDS_TOKEN } from '../authentication.constants.js';
import { GuardsPolicy } from '../domain/policies/guards.policy.js';

import { AuthGuardCtr, AuthGuardOptions } from './auth.guard.types.js';
import { AuthPublicMetadata } from './decorators/auth-public.decorator.js';

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

    canActivate(context: ExecutionContext) {
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
      return super.canActivate(context);
    }
  }

  return AuthGuard;
};

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
