// module
export { UserModule } from './user.module.js';

// domain aggregates
export { User } from './domain/aggregates/user.js';
export { UserCredentials } from './domain/aggregates/user-credentials.js';

// repositories
export { UserRepository } from './infrastructure/persistence/user.repository.js';
export { UserCredentialsRepository } from './infrastructure/persistence/user-credentials.repository.js';
export { UserRepositoryInterface } from './domain/repositories/user-repository.interface.js';
export { UserCredentialsRepositoryInterface } from './domain/repositories/user-credentials-repository.interface.js';

// schemas (Zod / Standard Schema)
export { userSchema } from './infrastructure/schemas/user.schema.js';
export { userCreateSchema } from './infrastructure/schemas/user-create.schema.js';
export { userUpdateSchema } from './infrastructure/schemas/user-update.schema.js';
export { userPasswordSchema } from './infrastructure/schemas/password/user-password.schema.js';
export { userPasswordUpdateSchema } from './infrastructure/schemas/password/user-password-update.schema.js';
export { userPasswordHashSchema } from './infrastructure/schemas/password/user-password-hash.schema.js';

// commands
export { CreateUserCommand } from './application/commands/impl/create-user.command.js';
export { UpdateUserCommand } from './application/commands/impl/update-user.command.js';
export { RemoveUserCommand } from './application/commands/impl/remove-user.command.js';
export { CreateUserCredentialCommand } from './application/commands/impl/create-user-credential.command.js';
export { UpdateUserCredentialCommand } from './application/commands/impl/update-user-credential.command.js';
export { SetUserPasswordCommand } from './application/commands/impl/set-user-password.command.js';
export { UpdateUserPasswordCommand } from './application/commands/impl/update-user-password.command.js';

// events
export { UserCreatedEvent } from './domain/events/user-created.event.js';
export { UserUpdatedEvent } from './domain/events/user-updated.event.js';
export { UserRemovedEvent } from './domain/events/user-removed.event.js';
export { UserCredentialsCreatedEvent } from './domain/events/user-credentials-created.event.js';
export { UserCredentialsDeactivatedEvent } from './domain/events/user-credentials-deactivated.event.js';

// queries
export { GetUserQuery } from './application/queries/impl/get-user.query.js';
export { GetUserByEmailQuery } from './application/queries/impl/get-user-by-email.query.js';
export { GetUserByUsernameQuery } from './application/queries/impl/get-user-by-username.query.js';
export { GetUserBySubjectQuery } from './application/queries/impl/get-user-by-subject.query.js';

// command handlers
export { CreateUserHandler } from './application/commands/handlers/create-user.handler.js';
export { UpdateUserHandler } from './application/commands/handlers/update-user.handler.js';
export { RemoveUserHandler } from './application/commands/handlers/remove-user.handler.js';
export { CreateUserCredentialHandler } from './application/commands/handlers/create-user-credential.handler.js';
export { UpdateUserCredentialHandler } from './application/commands/handlers/update-user-credential.handler.js';
export { SetUserPasswordHandler } from './application/commands/handlers/set-user-password.handler.js';
export { UpdateUserPasswordHandler } from './application/commands/handlers/update-user-password.handler.js';

// query handlers
export { GetUserHandler } from './application/queries/handlers/get-user.handler.js';
export { GetUserByEmailHandler } from './application/queries/handlers/get-user-by-email.handler.js';
export { GetUserBySubjectHandler } from './application/queries/handlers/get-user-by-subject.handler.js';
export { GetUserByUsernameHandler } from './application/queries/handlers/get-user-by-username.handler.js';

// domain services
export { UserCredentialsService } from './domain/services/user-credentials.service.js';

// ports
export {
  UserPasswordPort,
  UserPasswordPortSettings,
  CreatePasswordCommandInterface,
  ValidateCurrentPasswordCommandInterface,
  ValidatePasswordHistoryCommandInterface,
} from './domain/ports/user-password.port.js';

// domain interfaces
export { UserInterface } from './domain/interfaces/user.interface.js';
export { UserEntityInterface } from './domain/interfaces/user-entity.interface.js';
export { UserCreatableInterface } from './domain/interfaces/user-creatable.interface.js';
export { UserUpdatableInterface } from './domain/interfaces/user-updatable.interface.js';
export { UserOwnableInterface } from './domain/interfaces/user-ownable.interface.js';
export { UserRelationInterface } from './domain/interfaces/user-relation.interface.js';
export { UserCredentialInterface } from './domain/interfaces/user-credential.interface.js';
export { UserCredentialEntityInterface } from './domain/interfaces/user-credential-entity.interface.js';
export { UserCredentialCreatableInterface } from './domain/interfaces/user-credential-creatable.interface.js';

// config interfaces
export { UserOptionsInterface } from './infrastructure/config/interfaces/user-options.interface.js';
export { UserExtrasInterface } from './infrastructure/config/interfaces/user-extras.interface.js';
export { UserSettingsInterface } from './infrastructure/config/interfaces/user-settings.interface.js';
export { UserCredentialsEventPayloadInterface } from './domain/events/interfaces/user-credentials-event-payload.interface.js';
export { PasswordPolicySettings } from './domain/policies/user-password.policy.js';

// exceptions
export { UserException } from './domain/exceptions/user.exception.js';
export { UserNotFoundException } from './application/exceptions/user-not-found.exception.js';
export { UserCredentialsAlreadyExistException } from './domain/exceptions/user-credentials-already-exist.exception.js';
export { UserPasswordCurrentInvalidException } from './domain/exceptions/user-password-current-invalid.exception.js';
export { UserPasswordHistoryViolationException } from './domain/exceptions/user-password-history-violation.exception.js';
