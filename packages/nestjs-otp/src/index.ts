// module
export { OtpModule } from './otp.module.js';

// domain aggregate
export { Otp } from './domain/aggregates/otp.js';

// repositories
export { OtpRepository } from './infrastructure/persistence/otp.repository.js';
export { OtpRepositoryResolver } from './infrastructure/persistence/otp-repository.resolver.js';
export { OtpRepositoryInterface } from './domain/repositories/otp-repository.interface.js';
export { OtpRepositoryResolverInterface } from './domain/repositories/otp-repository-resolver.interface.js';

// schemas (Zod / Standard Schema)
export { otpCreateSchema } from './infrastructure/schemas/otp-create.schema.js';

// commands
export { ConsumeOtpCommand } from './application/commands/impl/consume-otp.command.js';
export { CreateOtpCommand } from './application/commands/impl/create-otp.command.js';
export { RemoveOtpCommand } from './application/commands/impl/remove-otp.command.js';
export { ClearOtpsCommand } from './application/commands/impl/clear-otps.command.js';
export { ClearOtpHistoryCommand } from './application/commands/impl/clear-otp-history.command.js';
export { DeactivateOtpCommand } from './application/commands/impl/deactivate-otp.command.js';

// events
export { OtpConsumedEvent } from './domain/events/otp-consumed.event.js';
export { OtpCreatedEvent } from './domain/events/otp-created.event.js';
export { OtpDeactivatedEvent } from './domain/events/otp-deactivated.event.js';

// queries
export { FindActiveOtpQuery } from './application/queries/impl/find-active-otp.query.js';
export { FindAssignedOtpsQuery } from './application/queries/impl/find-assigned-otps.query.js';
export { GetOtpQuery } from './application/queries/impl/get-otp.query.js';
export { ValidateOtpQuery } from './application/queries/impl/validate-otp.query.js';

// command handlers
export { ConsumeOtpHandler } from './application/commands/handlers/consume-otp.handler.js';
export { CreateOtpHandler } from './application/commands/handlers/create-otp.handler.js';
export { RemoveOtpHandler } from './application/commands/handlers/remove-otp.handler.js';
export { ClearOtpsHandler } from './application/commands/handlers/clear-otps.handler.js';
export { ClearOtpHistoryHandler } from './application/commands/handlers/clear-otp-history.handler.js';
export { DeactivateOtpHandler } from './application/commands/handlers/deactivate-otp.handler.js';

// event listeners
export { OtpHistoryCleanupListener } from './application/listeners/otp-history-cleanup.listener.js';

// domain services
export { OtpHistoryCleanupService } from './domain/services/otp-history-cleanup.service.js';

// query handlers
export { FindActiveOtpHandler } from './application/queries/handlers/find-active-otp.handler.js';
export { FindAssignedOtpsHandler } from './application/queries/handlers/find-assigned-otps.handler.js';
export { GetOtpHandler } from './application/queries/handlers/get-otp.handler.js';
export { ValidateOtpHandler } from './application/queries/handlers/validate-otp.handler.js';

// context overlay
export { OtpContextOverlay, OtpCtx } from './gateways/otp-context.overlay.js';
export { OtpNamespace } from './gateways/decorators/otp-namespace.decorator.js';

// domain interfaces
export { OtpInterface } from './domain/interfaces/otp.interface.js';
export { OtpCreatableInterface } from './domain/interfaces/otp-creatable.interface.js';
export { OtpTypeServiceInterface } from './domain/interfaces/otp-type-service.interface.js';

// domain policies
export { OtpPolicy, OtpPolicySettings } from './domain/policies/otp.policy.js';

// persistence interfaces
export { OtpEntityInterface } from './infrastructure/persistence/interfaces/otp-entity.interface.js';

// config interfaces
export { OtpExtrasInterface } from './infrastructure/config/interfaces/otp-extras.interface.js';
export { OtpOptionsInterface } from './infrastructure/config/interfaces/otp-options.interface.js';
export { OtpSettingsInterface } from './infrastructure/config/interfaces/otp-settings.interface.js';

// exceptions
export { OtpException } from './domain/exceptions/otp.exception.js';
export { OtpEntityNotFoundException } from './infrastructure/exceptions/otp-entity-not-found.exception.js';
export { OtpTypeNotDefinedException } from './domain/exceptions/otp-type-not-defined.exception.js';
export { OtpLimitReachedException } from './domain/exceptions/otp-limit-reached.exception.js';
export { OtpNotFoundException } from './application/exceptions/otp-not-found.exception.js';
export { OtpInvalidExpirationDateException } from './domain/exceptions/otp-invalid-expiration-date.exception.js';
export { OtpValidationException } from './domain/exceptions/otp-validation.exception.js';
