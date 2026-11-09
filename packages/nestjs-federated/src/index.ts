// module
export { FederatedModule } from './federated.module.js';

// aggregate
export { Identity } from './domain/aggregates/identity.js';

// domain interfaces
export { IdentityInterface } from './domain/interfaces/identity.interface.js';
export { IdentityCreatableInterface } from './domain/interfaces/identity-creatable.interface.js';

// domain events
export { IdentityCreatedEvent } from './domain/events/identity-created.event.js';

// domain repositories
export { IdentityRepositoryInterface } from './domain/repositories/identity-repository.interface.js';

// domain ports
export {
  FederatedUserPort,
  FederatedUserPortSettings,
  FederatedUserResult,
  GetUserByIdQueryInterface,
  GetUserByEmailQueryInterface,
  CreateUserCommandInterface,
} from './domain/ports/federated-user.port.js';

// domain services
export { FederatedOAuthService } from './domain/services/federated-oauth.service.js';
export { FederatedOAuthServiceInterface } from './domain/services/federated-oauth-service.interface.js';

// commands
export { CreateIdentityCommand } from './application/commands/impl/create-identity.command.js';

// command handlers
export { CreateIdentityHandler } from './application/commands/handlers/create-identity.handler.js';

// queries
export { FindIdentityByProviderQuery } from './application/queries/impl/find-identity-by-provider.query.js';

// query handlers
export { FindIdentityByProviderHandler } from './application/queries/handlers/find-identity-by-provider.handler.js';

// public interfaces
export { FederatedCredentialsInterface } from './interfaces/federated-credentials.interface.js';
export { FederatedOptionsInterface } from './interfaces/federated-options.interface.js';
export { FederatedOptionsExtrasInterface } from './interfaces/federated-options-extras.interface.js';

// config interfaces
export { FederatedSettingsInterface } from './infrastructure/config/interfaces/federated-settings.interface.js';

// schemas (Zod / Standard Schema)
export { identitySchema } from './infrastructure/schemas/identity.schema.js';
export { identityCreateSchema } from './infrastructure/schemas/identity-create.schema.js';

// persistence
export { IdentityMapper } from './infrastructure/persistence/identity.mapper.js';
export { IdentityRepository } from './infrastructure/persistence/identity.repository.js';
export { IdentityEntityInterface } from './infrastructure/persistence/interfaces/identity-entity.interface.js';

// domain exceptions
export { FederatedException } from './domain/exceptions/federated.exception.js';
export { IdentityCreateUserException } from './domain/exceptions/identity-create-user.exception.js';
export { IdentityFindUserException } from './domain/exceptions/identity-find-user.exception.js';
export { IdentityUserRelationshipException } from './domain/exceptions/identity-user-relationship.exception.js';

// constants
export {
  FEDERATED_MODULE_SETTINGS_TOKEN,
  FEDERATED_MODULE_DEFAULT_ENTITY_KEY,
  FEDERATED_MODULE_IDENTITY_REPOSITORY_TOKEN,
} from './federated.constants.js';
