import { firstValueFrom, isObservable } from 'rxjs';

import {
  CanActivate,
  Injectable,
  ExecutionContext,
  Inject,
} from '@nestjs/common';

import { AuthRouterModuleGuards } from './auth-router.constants';
import { AuthRouterGuardsRecord } from './auth-router.types';
import { AuthRouterAuthenticationFailedException } from './exceptions/auth-router-authentication-failed.exception';
import { AuthRouterConfigNotAvailableException } from './exceptions/auth-router-config-not-available.exception';
import { AuthRouterGuardInvalidException } from './exceptions/auth-router-guard-invalid.exception';
import { AuthRouterProviderMissingException } from './exceptions/auth-router-provider-missing.exception';
import { AuthRouterProviderNotSupportedException } from './exceptions/auth-router-provider-not-supported.exception';
import { AuthRouterException } from './exceptions/auth-router.exception';

/**
 * Auth Router
 *
 * This guard is responsible for handling Auth Router authentication by delegating
 * to provider-specific guards based on the 'provider' query parameter.
 */
@Injectable()
export class AuthRouterGuard implements CanActivate {
  constructor(
    @Inject(AuthRouterModuleGuards)
    private readonly allAuthRouterGuards: AuthRouterGuardsRecord,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const provider = request.query?.provider as string;
    const code = request.query?.code as string;
    const state = request.query?.state as string;

    // Handle callback case (when code is present)
    if (code) {
      let callbackProvider = provider;

      // If no provider in query, try to extract from state parameter
      if (!callbackProvider && state) {
        try {
          // The state parameter might be a JSON string containing provider info
          const stateData = JSON.parse(state);
          callbackProvider = stateData.provider;
        } catch (_error) {
          // Ignore parse errors
        }
      }

      if (!callbackProvider) {
        throw new AuthRouterProviderMissingException();
      }

      // Now proceed with the provider-specific guard
      return this.executeProviderGuard(callbackProvider?.trim(), context);
    }

    // Handle initial authorization request
    if (!provider) {
      throw new AuthRouterProviderMissingException();
    }

    const trimmedProvider = provider.trim();
    if (!trimmedProvider) {
      throw new AuthRouterProviderMissingException();
    }

    return this.executeProviderGuard(trimmedProvider, context);
  }

  private async executeProviderGuard(
    provider: string,
    context: ExecutionContext,
  ): Promise<boolean> {
    try {
      if (
        !this.allAuthRouterGuards ||
        typeof this.allAuthRouterGuards !== 'object'
      ) {
        throw new AuthRouterConfigNotAvailableException();
      }

      const guardInstance = this.getProviderGuard(provider);
      const result = guardInstance.canActivate(context);

      // Handle Observable, Promise, or boolean return types
      if (isObservable(result)) {
        const observableResult = await firstValueFrom(result);
        return Boolean(observableResult);
      } else if (result instanceof Promise) {
        const promiseResult = await result;
        return Boolean(promiseResult);
      } else {
        return Boolean(result);
      }
    } catch (error) {
      // Re-throw our custom Auth Router exceptions
      if (error instanceof AuthRouterException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new AuthRouterAuthenticationFailedException(provider, errorMessage);
    }
  }

  /**
   * Get the guard instance for the given provider.
   * Similar to CacheService.getAssignmentRepo()
   *
   * @internal
   * @param provider - The Auth Router provider name
   */
  protected getProviderGuard(provider: string): CanActivate {
    // Get the guard instance from the injected guards record
    const guardInstance = this.allAuthRouterGuards[provider];

    if (!guardInstance) {
      throw new AuthRouterProviderNotSupportedException(provider);
    }

    if (typeof guardInstance.canActivate !== 'function') {
      throw new AuthRouterGuardInvalidException(provider);
    }

    return guardInstance;
  }
}
