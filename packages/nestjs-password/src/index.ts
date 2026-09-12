// module
export { PasswordModule } from './password.module.js';

// enum
export { PasswordStrengthEnum } from './domain/enum/password-strength.enum.js';

// password primitives
export { PasswordPlainInterface } from './domain/password/interfaces/password-plain.interface.js';
export { PasswordPlainCurrentInterface } from './domain/password/interfaces/password-plain-current.interface.js';
export { PasswordStorageInterface } from './domain/password/interfaces/password-storage.interface.js';
export { PasswordUpdateInterface } from './domain/password/interfaces/password-update.interface.js';
export { isPasswordStorage } from './domain/password/is-password-storage.typeguard.js';

// domain policies
export {
  PasswordPolicy,
  PasswordPolicySettings,
} from './domain/policies/password.policy.js';

// domain services
export { PasswordCreationService } from './domain/services/password-creation.service.js';
export { PasswordStorageService } from './domain/services/password-storage.service.js';
export { PasswordValidationService } from './domain/services/password-validation.service.js';
export { PasswordStrengthService } from './domain/services/password-strength.service.js';

// domain interfaces
export { PasswordCreationServiceInterface } from './domain/interfaces/password-creation-service.interface.js';
export { PasswordStorageServiceInterface } from './domain/interfaces/password-storage-service.interface.js';
export { PasswordValidationServiceInterface } from './domain/interfaces/password-validation-service.interface.js';
export { PasswordStrengthServiceInterface } from './domain/interfaces/password-strength-service.interface.js';
export { PasswordHashObjectOptionsInterface } from './domain/interfaces/password-hash-object-options.interface.js';
export { PasswordValidateOptionsInterface } from './domain/interfaces/password-validate-options.interface.js';
export { PasswordCurrentPasswordInterface } from './domain/interfaces/password-current-password.interface.js';
export { PasswordHistoryPasswordInterface } from './domain/interfaces/password-history-password.interface.js';

// config interfaces
export { PasswordOptionsInterface } from './infrastructure/config/interfaces/password-options.interface.js';
export { PasswordSettingsInterface } from './infrastructure/config/interfaces/password-settings.interface.js';

// commands
export { CreatePasswordCommand } from './application/commands/impl/create-password.command.js';
export { ValidatePasswordCommand } from './application/commands/impl/validate-password.command.js';
export { ValidateCurrentPasswordCommand } from './application/commands/impl/validate-current-password.command.js';
export { ValidatePasswordHistoryCommand } from './application/commands/impl/validate-password-history.command.js';

// command handlers
export { CreatePasswordHandler } from './application/commands/handlers/create-password.handler.js';
export { ValidatePasswordHandler } from './application/commands/handlers/validate-password.handler.js';
export { ValidateCurrentPasswordHandler } from './application/commands/handlers/validate-current-password.handler.js';
export { ValidatePasswordHistoryHandler } from './application/commands/handlers/validate-password-history.handler.js';

// domain exceptions
export { PasswordException } from './domain/exceptions/password.exception.js';
export { PasswordCurrentRequiredException } from './domain/exceptions/password-current-required.exception.js';
export { PasswordNotStrongException } from './domain/exceptions/password-not-strong.exception.js';
export { PasswordRequiredException } from './domain/exceptions/password-required.exception.js';
export { PasswordUsedRecentlyException } from './domain/exceptions/password-used-recently.exception.js';
