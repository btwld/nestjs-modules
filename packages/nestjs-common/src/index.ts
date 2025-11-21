// DTOs
export { AuditDto } from './audit/dto/audit.dto';
export { CommonEntityDto } from './common/dto/common-entity.dto';
export { ReferenceIdDto } from './reference/dto/reference-id.dto';

// Decorators
export { AuthUser } from './decorators/auth-user.decorator';

// Module utilities
export { createSettingsProvider } from './modules/utils/create-settings-provider';

// Module interfaces
export { ModuleOptionsControllerInterface } from './modules/interfaces/module-options-controller.interface';
export { ModuleOptionsSettingsInterface } from './modules/interfaces/module-options-settings.interface';

// Domain exports
export * from './domain';

// Core types & exceptions
export { ExceptionContext } from './core.types';
export { ExceptionInterface } from './exceptions/interfaces/exception.interface';
export { NotAnErrorException } from './exceptions/not-an-error.exception';

// Utility types and functions
export { LiteralObject } from './utils/interfaces/literal-object.interface';
export { Type } from './utils/interfaces/type.interface';
export { DeepPartial } from './utils/deep-partial';
export { mapNonErrorToException } from './utils/map-non-error-to-exception.util';
export { mapHttpStatus } from './utils/map-http-status.util';
export { toMilliseconds } from './utils/to-milliseconds';

// Reference types
export {
  ReferenceActive,
  ReferenceAssignment,
  ReferenceEmail,
  ReferenceId,
  ReferenceSubject,
  ReferenceUsername,
} from './reference/interfaces/reference.types';

// Reference interfaces
export { ReferenceActiveInterface } from './reference/interfaces/reference-active.interface';
export { ReferenceAssigneeInterface } from './reference/interfaces/reference-assignee.interface';
export { ReferenceAssignmentInterface } from './reference/interfaces/reference-assignment.interface';
export { ReferenceEmailInterface } from './reference/interfaces/reference-email.interface';
export { ReferenceIdInterface } from './reference/interfaces/reference-id.interface';
export { ReferenceSubjectInterface } from './reference/interfaces/reference-subject.interface';
export { ReferenceUsernameInterface } from './reference/interfaces/reference-username.interface';
export { ReferenceUserInterface } from './reference/interfaces/reference-user.interface';
export { ReferenceRoleInterface } from './reference/interfaces/reference-role.interface';
export { ReferenceRolesInterface } from './reference/interfaces/reference-roles.interface';

// model exceptions
export { ModelQueryException } from './model/exceptions/model-query.exception';
export { ModelMutateException } from './model/exceptions/model-mutate.exception';
export { ModelValidationException } from './model/exceptions/model-validation.exception';
export { ModelIdNoMatchException } from './model/exceptions/model-id-no-match.exception';

// model services
export { ModelService } from './model/model.service';
export { ModelServiceInterface } from './model/interfaces/model-service.interface';

// model query interfaces
export { FindInterface } from './model/interfaces/query/find.interface';
export { ByEmailInterface } from './model/interfaces/query/by-email.interface';
export { ByIdInterface } from './model/interfaces/query/by-id.interface';
export { BySubjectInterface } from './model/interfaces/query/by-subject.interface';
export { ByUsernameInterface } from './model/interfaces/query/by-username.interface';

// model mutation interfaces
export { CreateOneInterface } from './model/interfaces/mutate/create-one.interface';
export { RemoveOneInterface } from './model/interfaces/mutate/remove-one.interface';
export { ReplaceOneInterface } from './model/interfaces/mutate/replace-one.interface';
export { UpdateOneInterface } from './model/interfaces/mutate/update-one.interface';

// Repository interfaces
export { RepositoryInterface } from './repository/interfaces/repository.interface';
export { RepositoryEntityOptionInterface } from './repository/interfaces/repository-entity-option.interface';

// Repository utils
export { getDynamicRepositoryToken } from './repository/utils/get-dynamic-repository-token';

// Repository decorators
export { InjectDynamicRepository } from './repository/decorators/inject-dynamic-repository.decorator';

// Audit types
export {
  AuditDateCreated,
  AuditDateDeleted,
  AuditDateUpdated,
  AuditVersion,
} from './audit/interfaces/audit.types';

// Audit interfaces
export { AuditDateCreatedInterface } from './audit/interfaces/audit-date-created.interface';
export { AuditDateDeletedInterface } from './audit/interfaces/audit-date-deleted.interface';
export { AuditDateUpdatedInterface } from './audit/interfaces/audit-date-updated.interface';
export { AuditVersionInterface } from './audit/interfaces/audit-version.interface';
export { AuditInterface } from './audit/interfaces/audit.interface';

// exception types
export { RuntimeExceptionContext } from './exceptions/exception.types';

// filters
export { ExceptionsFilter } from './filters/exceptions.filter';

// exception interfaces
export { RuntimeExceptionOptions } from './exceptions/interfaces/runtime-exception-options.interface';
export { RuntimeExceptionInterface } from './exceptions/interfaces/runtime-exception.interface';

// exceptions
export { RuntimeException } from './exceptions/runtime.exception';

// !!! THESE EXPORTS ARE TEMPORARY AND MAY BE REMOVED IN THE FUTURE !!!
export { RepositoryInternals } from './repository/interfaces/repository-internals';
