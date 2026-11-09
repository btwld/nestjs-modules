// gateways (context overlays)
export {
  AuthUserCtx,
  AuthUserContextOverlay,
} from './gateways/auth-user-context.overlay.js';
export { AuthUserContextInterface } from './gateways/interfaces/auth-user-context.interface.js';

// domain aggregates
export { Token } from './domain/aggregates/token.aggregate.js';

// domain interfaces
export { AuthenticatedUserInterface } from './domain/interfaces/authenticated-user.interface.js';
export { AuthenticationAccessInterface } from './domain/interfaces/authentication-access.interface.js';
export { AuthenticationLoginInterface } from './domain/interfaces/authentication-login.interface.js';
export { AuthenticationRefreshInterface } from './domain/interfaces/authentication-refresh.interface.js';
export { AuthenticatedResponseInterface } from './domain/interfaces/authenticated-response.interface.js';
export { AuthorizationPayloadInterface } from './domain/interfaces/authorization-payload.interface.js';
export {
  TokenInterface,
  TokenType,
} from './domain/interfaces/token.interface.js';
export { TokenCreatableInterface } from './domain/interfaces/token-creatable.interface.js';

// domain events
export { TokenIssuedEvent } from './domain/events/token-issued.event.js';
export { TokenRevokedEvent } from './domain/events/token-revoked.event.js';
export { NotificationSendFailedEvent } from './domain/events/notification-send-failed.event.js';

export { AuthenticationModule } from './authentication.module.js';

export { PassportStrategyFactory } from './infrastructure/passport/passport-strategy.factory.js';
export { AuthGuard } from './infrastructure/auth.guard.js';

export { AuthUser } from './infrastructure/decorators/auth-user.decorator.js';
export {
  AuthPublic,
  AuthPublicMetadata,
  AuthPublicOptions,
} from './infrastructure/decorators/auth-public.decorator.js';
export { isAuthPublic } from './infrastructure/decorators/is-auth-public.util.js';

export { AuthenticationOptionsInterface } from './infrastructure/config/interfaces/authentication-options.interface.js';
export { AuthenticationOptionsExtrasInterface } from './infrastructure/config/interfaces/authentication-options-extras.interface.js';
export {
  AuthenticationSettingsInterface,
  AuthenticationStrategiesSettingsInterface,
  AuthenticationMfaSettingsInterface,
} from './infrastructure/config/interfaces/authentication-settings.interface.js';
export { OAuthAuthenticateOptionsInterface } from './infrastructure/config/interfaces/oauth-authenticate-options.interface.js';
export { OAuthParamsInterface } from './infrastructure/config/interfaces/oauth-params.interface.js';
export { OAuthRequestInterface } from './infrastructure/config/interfaces/oauth-request.interface.js';

export { authenticationResponseSchema } from './infrastructure/schemas/authentication-response.schema.js';

export {
  AuthGuardOptions,
  AuthGuardCtr,
} from './infrastructure/auth.guard.types.js';
export { AuthenticationEmailException } from './domain/exceptions/authentication-email.exception.js';
export { TokenException } from './domain/exceptions/token.exception.js';
export { TokenAlreadyRevokedException } from './domain/exceptions/token-already-revoked.exception.js';
export { AuthenticationException } from './domain/exceptions/authentication.exception.js';
export { AuthenticationAccessTokenException } from './application/exceptions/authentication-access-token.exception.js';
export { AuthenticationRefreshTokenException } from './application/exceptions/authentication-refresh-token.exception.js';
export { AuthenticationUserPortRequiredException } from './application/exceptions/authentication-user-port-required.exception.js';
export { AuthenticationFeatureConfigException } from './infrastructure/exceptions/authentication-feature-config.exception.js';

export { processOAuthParams } from './infrastructure/utils/oauth-auth-params.util.js';

// jwt (tokens layer)
export { JwtService } from './infrastructure/jwt/jwt.service.js';
export {
  JwtPort,
  JwtPortSettings,
  SignTokenCommandInterface,
  JwtVerifyTokenQueryInterface,
} from './domain/ports/jwt.port.js';
export { AUTHENTICATION_JWT_PORT_TOKEN } from './authentication.constants.js';
export { ExtractJwt, JwtFromRequestFunction } from 'passport-jwt';
export { JwtException } from './infrastructure/jwt/exceptions/jwt.exception.js';
export { JwtVerifyException } from './infrastructure/jwt/exceptions/jwt-verify.exception.js';

// passport adapter layer
export { JwtVerifyTokenCallback } from './infrastructure/passport/jwt-passport.types.js';
export { JwtPassportOptionsInterface } from './infrastructure/passport/interfaces/jwt-passport-options.interface.js';
export { JwtPassportStrategy } from './infrastructure/passport/jwt-passport.strategy.js';
export { createVerifyTokenCallback } from './infrastructure/passport/utils/create-verify-token-callback.util.js';

// auth-jwt feature
export { JwtStrategy } from './infrastructure/strategies/jwt/jwt.strategy.js';
export { JwtGuard } from './infrastructure/strategies/jwt/jwt.guard.js';
export { JwtAuthenticationException } from './infrastructure/strategies/jwt/exceptions/jwt-authentication.exception.js';
export { JwtUnauthorizedException } from './infrastructure/strategies/jwt/exceptions/jwt-unauthorized.exception.js';

// auth-local feature
export { LocalService } from './application/services/local/local.service.js';
export { LocalGuard } from './infrastructure/strategies/local/local.guard.js';
export { LocalValidateUserInterface } from './application/services/local/interfaces/local-validate-user.interface.js';
export { LocalServiceInterface } from './application/services/local/interfaces/local-service.interface.js';
export { LocalCredentialsInterface } from './infrastructure/strategies/local/interfaces/local-credentials.interface.js';
export { localLoginSchema } from './infrastructure/strategies/local/schemas/local-login.schema.js';
export { LocalException } from './infrastructure/strategies/local/exceptions/local.exception.js';
export { LocalUsernameNotFoundException } from './application/exceptions/local-username-not-found.exception.js';
export { LocalUserInactiveException } from './application/exceptions/local-user-inactive.exception.js';
export { LocalUnauthorizedException } from './infrastructure/strategies/local/exceptions/local-unauthorized.exception.js';
export { LocalInvalidPasswordException } from './application/exceptions/local-invalid-password.exception.js';
export { LocalInvalidLoginDataException } from './infrastructure/strategies/local/exceptions/local-invalid-login-data.exception.js';
export { LocalInvalidCredentialsException } from './infrastructure/strategies/local/exceptions/local-invalid-credentials.exception.js';

// auth-refresh feature
export { refreshSchema } from './infrastructure/strategies/refresh/schemas/refresh.schema.js';
export { RefreshGuard } from './infrastructure/strategies/refresh/refresh.guard.js';
export { RefreshException } from './infrastructure/strategies/refresh/exceptions/refresh.exception.js';
export { RefreshUnauthorizedException } from './infrastructure/strategies/refresh/exceptions/refresh-unauthorized.exception.js';

// auth-recovery feature
export { RecoveryService } from './application/services/recovery/recovery.service.js';
export { recoveryRecoverLoginSchema } from './infrastructure/mfa/recovery/schemas/recovery-recover-login.schema.js';
export { recoveryRecoverPasswordSchema } from './infrastructure/mfa/recovery/schemas/recovery-recover-password.schema.js';
export { recoveryUpdatePasswordSchema } from './infrastructure/mfa/recovery/schemas/recovery-update-password.schema.js';
export { recoveryValidatePasscodeSchema } from './infrastructure/mfa/recovery/schemas/recovery-validate-passcode.schema.js';
export { RecoveryRecoverLoginParamsInterface } from './application/services/recovery/interfaces/recovery-recover-login-params.interface.js';
export { RecoveryRecoverPasswordParamsInterface } from './application/services/recovery/interfaces/recovery-recover-password-params.interface.js';
export { RecoveryUpdatePasswordParamsInterface } from './application/services/recovery/interfaces/recovery-update-password-params.interface.js';
export { RecoveryValidatePasscodeParamsInterface } from './application/services/recovery/interfaces/recovery-validate-passcode-params.interface.js';
export { RecoveryException } from './infrastructure/mfa/recovery/exceptions/recovery.exception.js';
export { RecoveryOtpInvalidException } from './infrastructure/mfa/recovery/exceptions/recovery-otp-invalid.exception.js';

// auth-verify feature
export { VerifyService } from './application/services/verify/verify.service.js';
export { verifySchema } from './infrastructure/mfa/verify/schemas/verify.schema.js';
export { verifyUpdateSchema } from './infrastructure/mfa/verify/schemas/verify-update.schema.js';
export { VerifyConfirmParamsInterface } from './application/services/verify/interfaces/verify-confirm-params.interface.js';
export { VerifySendParamsInterface } from './application/services/verify/interfaces/verify-send-params.interface.js';
export { VerifyException } from './infrastructure/mfa/verify/exceptions/verify.exception.js';
export { VerifyOtpInvalidException } from './application/exceptions/verify-otp-invalid.exception.js';

// auth-router feature
export { AuthRouterGuard } from './infrastructure/router/auth-router.guard.js';
export { AuthRouterGuardsRecord } from './infrastructure/router/auth-router.types.js';
export { AuthRouterException } from './infrastructure/router/exceptions/auth-router.exception.js';
export { AuthRouterGuardConfigInterface } from './infrastructure/router/interfaces/auth-router-guard-config.interface.js';

// domain policies
export {
  OtpPolicy,
  OtpPolicySettingsInterface,
} from './domain/policies/otp.policy.js';
export {
  JwtPolicy,
  JwtPolicySettingsInterface,
} from './domain/policies/jwt.policy.js';
export { TokenOptionsInterface } from './domain/interfaces/token-options.interface.js';
export {
  JwtStrategyPolicy,
  JwtStrategyPolicySettingsInterface,
} from './domain/policies/jwt-strategy.policy.js';
export {
  LocalStrategyPolicy,
  LocalStrategyPolicySettingsInterface,
} from './domain/policies/local-strategy.policy.js';
export {
  RefreshStrategyPolicy,
  RefreshStrategyPolicySettingsInterface,
} from './domain/policies/refresh-strategy.policy.js';
export {
  GuardsPolicy,
  GuardsPolicySettingsInterface,
} from './domain/policies/guards.policy.js';
export {
  RecoveryPolicy,
  RecoveryPolicySettingsInterface,
} from './domain/policies/recovery.policy.js';
export {
  VerifyPolicy,
  VerifyPolicySettingsInterface,
} from './domain/policies/verify.policy.js';

// domain ports
export {
  TokenPort,
  TokenPortSettings,
  IssueTokenCommandInterface,
  VerifyTokenQueryInterface,
  ValidateTokenQueryInterface,
} from './domain/ports/token.port.js';
export {
  UserPort,
  UserPortSettings,
  AuthenticationUserInterface,
  AuthenticationUserResult,
  GetUserByIdQueryInterface,
  GetUserBySubjectQueryInterface,
  GetUserByUsernameQueryInterface,
  GetUserByEmailQueryInterface,
  UpdateUserCommandInterface,
} from './domain/ports/user.port.js';
export {
  PasswordPort,
  PasswordPortSettings,
  ValidatePasswordCommandInterface,
  SetPasswordCommandInterface,
} from './domain/ports/password.port.js';
export {
  OtpPort,
  OtpPortSettings,
  AuthenticationOtpCreatableInterface,
  AuthenticationOtpInterface,
  CreateOtpCommandInterface,
  ValidateOtpQueryInterface,
  ClearOtpCommandInterface,
} from './domain/ports/otp.port.js';
export {
  RecoveryNotificationPort,
  RecoveryNotificationPortSettings,
  SendRecoverLoginNotificationCommandInterface,
  SendRecoverPasswordNotificationCommandInterface,
  SendPasswordUpdatedNotificationCommandInterface,
} from './domain/ports/recovery-notification.port.js';
export {
  VerifyNotificationPort,
  VerifyNotificationPortSettings,
  SendVerifyNotificationCommandInterface,
} from './domain/ports/verify-notification.port.js';

// ports options
export { AuthenticationPortsInterface } from './infrastructure/config/interfaces/authentication-options.interface.js';

// default CQRS commands/queries (for TokenPort)
export { IssueAccessTokenCommand } from './application/commands/impl/issue-access-token.command.js';
export { IssueRefreshTokenCommand } from './application/commands/impl/issue-refresh-token.command.js';
export { IssueAuthenticatedResponseCommand } from './application/commands/impl/issue-authenticated-response.command.js';
export { VerifyAccessTokenQuery } from './application/queries/impl/verify-access-token.query.js';
export { VerifyRefreshTokenQuery } from './application/queries/impl/verify-refresh-token.query.js';
export { ValidateTokenQuery } from './application/queries/impl/validate-token.query.js';
export {
  ValidateAndVerifyAccessTokenQuery,
  ValidateAndVerifyAccessTokenQueryInterface,
} from './application/queries/impl/validate-and-verify-access-token.query.js';
export {
  ValidateAndVerifyRefreshTokenQuery,
  ValidateAndVerifyRefreshTokenQueryInterface,
} from './application/queries/impl/validate-and-verify-refresh-token.query.js';

// default CQRS commands/queries (for JwtPort)
export { SignAccessTokenCommand } from './application/commands/impl/sign-access-token.command.js';
export { SignRefreshTokenCommand } from './application/commands/impl/sign-refresh-token.command.js';
export { JwtVerifyAccessTokenQuery } from './application/queries/impl/jwt-verify-access-token.query.js';
export { JwtVerifyRefreshTokenQuery } from './application/queries/impl/jwt-verify-refresh-token.query.js';
