import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';

import { IssueAccessTokenHandler } from './application/commands/handlers/issue-access-token.handler.js';
import { IssueAuthenticatedResponseHandler } from './application/commands/handlers/issue-authenticated-response.handler.js';
import { IssueRefreshTokenHandler } from './application/commands/handlers/issue-refresh-token.handler.js';
import { SignAccessTokenHandler } from './application/commands/handlers/sign-access-token.handler.js';
import { SignRefreshTokenHandler } from './application/commands/handlers/sign-refresh-token.handler.js';
import { JwtVerifyAccessTokenHandler } from './application/queries/handlers/jwt-verify-access-token.handler.js';
import { JwtVerifyRefreshTokenHandler } from './application/queries/handlers/jwt-verify-refresh-token.handler.js';
import { ValidateAndVerifyAccessTokenHandler } from './application/queries/handlers/validate-and-verify-access-token.handler.js';
import { ValidateAndVerifyRefreshTokenHandler } from './application/queries/handlers/validate-and-verify-refresh-token.handler.js';
import { ValidateTokenHandler } from './application/queries/handlers/validate-token.handler.js';
import { VerifyAccessTokenHandler } from './application/queries/handlers/verify-access-token.handler.js';
import { VerifyRefreshTokenHandler } from './application/queries/handlers/verify-refresh-token.handler.js';
import { LocalService } from './application/services/local/local.service.js';
import { RecoveryService } from './application/services/recovery/recovery.service.js';
import { VerifyService } from './application/services/verify/verify.service.js';
import { AUTHENTICATION_JWT_PORT_TOKEN } from './authentication.constants.js';
import { GuardsPolicy } from './domain/policies/guards.policy.js';
import { JwtPolicy } from './domain/policies/jwt.policy.js';
import { AuthUserContextOverlay } from './gateways/auth-user-context.overlay.js';
import { authenticationDefaultConfig } from './infrastructure/config/authentication-default.config.js';
import { type AuthenticationOptionsExtrasInterface } from './infrastructure/config/interfaces/authentication-options-extras.interface.js';
import { type AuthenticationOptionsInterface } from './infrastructure/config/interfaces/authentication-options.interface.js';
import { NestJwtModule } from './infrastructure/jwt/jwt.externals.js';
import { JwtService } from './infrastructure/jwt/jwt.service.js';
import { AuthRouterGuards } from './infrastructure/router/auth-router.constants.js';
import { JwtGuard } from './infrastructure/strategies/jwt/jwt.guard.js';
import { JwtStrategy } from './infrastructure/strategies/jwt/jwt.strategy.js';
import { createAuthRouterGuardsProviders } from './infrastructure/utils/create-auth-router-guards-providers.js';
import { createGuardsPolicyProvider } from './infrastructure/utils/create-guards-policy-provider.js';
import { createJwtAppGuardProvider } from './infrastructure/utils/create-jwt-app-guard-provider.js';
import { createJwtPolicyProvider } from './infrastructure/utils/create-jwt-policy-provider.js';
import { createJwtPortProvider } from './infrastructure/utils/create-jwt-port-provider.js';
import { createJwtStrategyPolicyProvider } from './infrastructure/utils/create-jwt-strategy-policy-provider.js';
import { createJwtStrategyProvider } from './infrastructure/utils/create-jwt-strategy-provider.js';
import { createLocalStrategyPolicyProvider } from './infrastructure/utils/create-local-strategy-policy-provider.js';
import { createLocalStrategyProvider } from './infrastructure/utils/create-local-strategy-provider.js';
import { createLocalValidateUserServiceProvider } from './infrastructure/utils/create-local-validate-user-service-provider.js';
import { createOtpPortProvider } from './infrastructure/utils/create-otp-port-provider.js';
import { createPasswordPortProvider } from './infrastructure/utils/create-password-port-provider.js';
import { createRecoveryNotificationPortProvider } from './infrastructure/utils/create-recovery-notification-port-provider.js';
import { createRecoveryPolicyProvider } from './infrastructure/utils/create-recovery-policy-provider.js';
import { createRecoveryServiceProvider } from './infrastructure/utils/create-recovery-service-provider.js';
import { createRefreshStrategyPolicyProvider } from './infrastructure/utils/create-refresh-strategy-policy-provider.js';
import { createRefreshStrategyProvider } from './infrastructure/utils/create-refresh-strategy-provider.js';
import { createTokenPortProvider } from './infrastructure/utils/create-token-port-provider.js';
import { createUserPortProvider } from './infrastructure/utils/create-user-port-provider.js';
import { createVerifyNotificationPortProvider } from './infrastructure/utils/create-verify-notification-port-provider.js';
import { createVerifyPolicyProvider } from './infrastructure/utils/create-verify-policy-provider.js';
import { createVerifyServiceProvider } from './infrastructure/utils/create-verify-service-provider.js';

const RAW_OPTIONS_TOKEN = Symbol('__AUTHENTICATION_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: AuthenticationModuleClass,
  OPTIONS_TYPE: AUTHENTICATION_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: AUTHENTICATION_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<AuthenticationOptionsInterface>({
  moduleName: 'Authentication',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<AuthenticationOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type AuthenticationOptions = Omit<
  typeof AUTHENTICATION_OPTIONS_TYPE,
  'global'
>;

export type AuthenticationAsyncOptions = Omit<
  typeof AUTHENTICATION_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: AuthenticationOptionsExtrasInterface,
): DynamicModule {
  const { imports = [], providers = [] } = definition;
  const { global = false } = extras;

  return {
    ...definition,
    global,
    imports: createAuthenticationImports({ imports }),
    providers: createAuthenticationProviders({ providers, extras }),
    exports: [
      ConfigModule,
      RAW_OPTIONS_TOKEN,
      ...(createAuthenticationExports(extras) ?? []),
    ],
  };
}

export function createAuthenticationImports(options: {
  imports: DynamicModule['imports'];
}): DynamicModule['imports'] {
  return [
    ...(options.imports || []),
    CqrsModule,
    NestJwtModule.register({}),
    ConfigModule.forFeature(authenticationDefaultConfig),
  ];
}

export function createAuthenticationExports(
  extras?: AuthenticationOptionsExtrasInterface,
): DynamicModule['exports'] {
  const exports: DynamicModule['exports'] = [
    AUTHENTICATION_JWT_PORT_TOKEN,
    JwtService,
    JwtPolicy,
    JwtStrategy,
    JwtGuard,
    GuardsPolicy,
    LocalService,
    RecoveryService,
    VerifyService,
  ];

  if (extras?.guards?.length) {
    exports.push(
      AuthRouterGuards,
      ...extras.guards.map((config) => config.guard),
    );
  }

  return exports;
}

export function createAuthenticationProviders(options: {
  providers?: Provider[];
  extras?: AuthenticationOptionsExtrasInterface;
}): Provider[] {
  return [
    ...(options.providers ?? []),
    // Port providers (from options.ports config, resolved at DI time)
    ...createAuthenticationPortProviders(),
    // JWT infrastructure
    JwtService,
    // Policies (always registered with defaults)
    createJwtPolicyProvider(RAW_OPTIONS_TOKEN),
    createJwtStrategyPolicyProvider(RAW_OPTIONS_TOKEN),
    createLocalStrategyPolicyProvider(RAW_OPTIONS_TOKEN),
    createRefreshStrategyPolicyProvider(RAW_OPTIONS_TOKEN),
    createRecoveryPolicyProvider(RAW_OPTIONS_TOKEN),
    createVerifyPolicyProvider(RAW_OPTIONS_TOKEN),
    createGuardsPolicyProvider(RAW_OPTIONS_TOKEN),
    // CQRS handlers — JwtPort default handlers (infrastructure)
    SignAccessTokenHandler,
    SignRefreshTokenHandler,
    JwtVerifyAccessTokenHandler,
    JwtVerifyRefreshTokenHandler,
    // CQRS handlers — TokenPort default handlers (application)
    IssueAccessTokenHandler,
    IssueRefreshTokenHandler,
    VerifyAccessTokenHandler,
    VerifyRefreshTokenHandler,
    IssueAuthenticatedResponseHandler,
    ValidateTokenHandler,
    ValidateAndVerifyAccessTokenHandler,
    ValidateAndVerifyRefreshTokenHandler,
    // Auth-JWT feature
    JwtGuard,
    createJwtStrategyProvider(RAW_OPTIONS_TOKEN),
    createJwtAppGuardProvider(RAW_OPTIONS_TOKEN, options.extras ?? {}),
    // Auth-Local feature
    createLocalValidateUserServiceProvider(RAW_OPTIONS_TOKEN),
    createLocalStrategyProvider(RAW_OPTIONS_TOKEN),
    // Auth-Refresh feature
    createRefreshStrategyProvider(RAW_OPTIONS_TOKEN),
    // Auth-Recovery feature
    createRecoveryServiceProvider(RAW_OPTIONS_TOKEN),
    // Auth-Verify feature
    createVerifyServiceProvider(RAW_OPTIONS_TOKEN),
    // Auth-Router feature
    ...(options.extras?.guards?.length
      ? createAuthRouterGuardsProviders(options.extras.guards)
      : []),
    // Context overlays
    { provide: APP_INTERCEPTOR, useClass: AuthUserContextOverlay },
  ];
}

export function createAuthenticationPortProviders(): Provider[] {
  return [
    createJwtPortProvider(RAW_OPTIONS_TOKEN),
    createTokenPortProvider(RAW_OPTIONS_TOKEN),
    createUserPortProvider(RAW_OPTIONS_TOKEN),
    createPasswordPortProvider(RAW_OPTIONS_TOKEN),
    createOtpPortProvider(RAW_OPTIONS_TOKEN),
    createRecoveryNotificationPortProvider(RAW_OPTIONS_TOKEN),
    createVerifyNotificationPortProvider(RAW_OPTIONS_TOKEN),
  ];
}
