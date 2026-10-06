// module
export { RoleModule } from './role.module.js';

// domain aggregates
export { Role } from './domain/aggregates/role.js';
export { RoleAssignment } from './domain/aggregates/role-assignment.js';

// repositories
export { RoleRepository } from './infrastructure/persistence/role.repository.js';
export { RoleAssignmentRepository } from './infrastructure/persistence/role-assignment.repository.js';
export { RoleRepositoryResolver } from './infrastructure/persistence/role-repository.resolver.js';
export { RoleAssignmentRepositoryResolver } from './infrastructure/persistence/role-assignment-repository.resolver.js';

// schemas (Zod / Standard Schema)
export { roleSchema } from './infrastructure/schemas/role.schema.js';
export { roleCreateSchema } from './infrastructure/schemas/role-create.schema.js';
export { roleUpdateSchema } from './infrastructure/schemas/role-update.schema.js';
export { roleAssignmentSchema } from './infrastructure/schemas/role-assignment.schema.js';
export { roleAssignmentCreateSchema } from './infrastructure/schemas/role-assignment-create.schema.js';

// commands
export { CreateRoleCommand } from './application/commands/impl/create-role.command.js';
export { UpdateRoleCommand } from './application/commands/impl/update-role.command.js';
export { ReplaceRoleCommand } from './application/commands/impl/replace-role.command.js';
export { RemoveRoleCommand } from './application/commands/impl/remove-role.command.js';
export { AssignRoleCommand } from './application/commands/impl/assign-role.command.js';
export { AssignRolesCommand } from './application/commands/impl/assign-roles.command.js';
export { RevokeRoleCommand } from './application/commands/impl/revoke-role.command.js';
export { RevokeRolesCommand } from './application/commands/impl/revoke-roles.command.js';

// events
export { RoleCreatedEvent } from './domain/events/role-created.event.js';
export { RoleUpdatedEvent } from './domain/events/role-updated.event.js';
export { RoleReplacedEvent } from './domain/events/role-replaced.event.js';
export { RoleAssignedEvent } from './domain/events/role-assigned.event.js';
export { RoleRevokedEvent } from './domain/events/role-revoked.event.js';

// queries
export { GetRoleQuery } from './application/queries/impl/get-role.query.js';
export { GetAssignedRolesQuery } from './application/queries/impl/get-assigned-roles.query.js';
export { IsAssignedRoleQuery } from './application/queries/impl/is-assigned-role.query.js';
export { IsAssignedRolesQuery } from './application/queries/impl/is-assigned-roles.query.js';
export { GetRoleAssignmentQuery } from './application/queries/impl/get-role-assignment.query.js';

// command handlers
export { CreateRoleHandler } from './application/commands/handlers/create-role.handler.js';
export { UpdateRoleHandler } from './application/commands/handlers/update-role.handler.js';
export { ReplaceRoleHandler } from './application/commands/handlers/replace-role.handler.js';
export { RemoveRoleHandler } from './application/commands/handlers/remove-role.handler.js';
export { AssignRoleHandler } from './application/commands/handlers/assign-role.handler.js';
export { AssignRolesHandler } from './application/commands/handlers/assign-roles.handler.js';
export { RevokeRoleHandler } from './application/commands/handlers/revoke-role.handler.js';
export { RevokeRolesHandler } from './application/commands/handlers/revoke-roles.handler.js';

// query handlers
export { GetRoleHandler } from './application/queries/handlers/get-role.handler.js';
export { GetAssignedRolesHandler } from './application/queries/handlers/get-assigned-roles.handler.js';
export { IsAssignedRoleHandler } from './application/queries/handlers/is-assigned-role.handler.js';
export { IsAssignedRolesHandler } from './application/queries/handlers/is-assigned-roles.handler.js';
export { GetRoleAssignmentHandler } from './application/queries/handlers/get-role-assignment.handler.js';

// domain repository interfaces
export { RoleRepositoryInterface } from './domain/repositories/role-repository.interface.js';
export { RoleRepositoryResolverInterface } from './domain/repositories/role-repository-resolver.interface.js';
export { RoleAssignmentRepositoryInterface } from './domain/repositories/role-assignment-repository.interface.js';
export { RoleAssignmentRepositoryResolverInterface } from './domain/repositories/role-assignment-repository-resolver.interface.js';

// domain interfaces
export { RoleInterface } from './domain/interfaces/role.interface.js';
export { RoleCreatableInterface } from './domain/interfaces/role-creatable.interface.js';
export { RoleUpdatableInterface } from './domain/interfaces/role-updatable.interface.js';
export { RoleEntityInterface } from './domain/interfaces/role-entity.interface.js';
export { RoleAssignmentInterface } from './domain/interfaces/role-assignment.interface.js';
export { RoleAssignmentCreatableInterface } from './domain/interfaces/role-assignment-creatable.interface.js';
export { RoleAssignmentEntityInterface } from './domain/interfaces/role-assignment-entity.interface.js';
export { RoleAssigneesInterface } from './domain/interfaces/role-assignees.interface.js';
export { RoleRelationInterface } from './domain/interfaces/role-relation.interface.js';

// config interfaces
export { RoleOptionsInterface } from './infrastructure/config/interfaces/role-options.interface.js';
export { RoleExtrasInterface } from './infrastructure/config/interfaces/role-extras.interface.js';

// exceptions
export { RoleException } from './application/exceptions/role.exception.js';
// context overlay
export {
  RoleContextOverlay,
  RoleCtx,
} from './gateways/role-context.overlay.js';
export { RoleNamespace } from './gateways/decorators/role-namespace.decorator.js';

export { RoleAssignmentConflictException } from './application/exceptions/role-assignment-conflict.exception.js';
export { RoleAssignmentsConflictException } from './application/exceptions/role-assignments-conflict.exception.js';
export { RoleEntityNotFoundException } from './infrastructure/exceptions/role-entity-not-found.exception.js';
export { RoleNotFoundException } from './application/exceptions/role-not-found.exception.js';
export { RoleAssignmentNotFoundException } from './application/exceptions/role-assignment-not-found.exception.js';
