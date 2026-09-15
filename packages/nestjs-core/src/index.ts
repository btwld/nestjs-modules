// Enums
export { ActionEnum } from './domain/enums/action.enum.js';
export {
  Operation,
  ReadOperations,
  WriteOperations,
  MutateOperations,
} from './domain/enums/operation.enum.js';

// Core
export { DomainFactory } from './domain/factories/domain-factory.interface.js';

// Schemas (Zod / Standard Schema)
export { auditSchema } from './infrastructure/schemas/audit.schema.js';
export { referenceIdSchema } from './infrastructure/schemas/reference-id.schema.js';
export { conformsTo } from './infrastructure/schemas/conforms-to.util.js';
export {
  withOpenApi,
  withNamedComponent,
  standardSchemaConverter,
  isStandardSchema,
} from './infrastructure/schemas/open-api.util.js';

// Module utilities
export { createSettingsProvider } from './infrastructure/utils/create-settings-provider.js';

// Module interfaces
export { ModuleOptionsControllerInterface } from './infrastructure/config/interfaces/module-options-controller.interface.js';
export { ModuleOptionsSettingsInterface } from './infrastructure/config/interfaces/module-options-settings.interface.js';

// Domain exports
export { AssigneeRelationInterface } from './domain/assignee/interfaces/assignee-relation.interface.js';

// Core types & exceptions
export {
  ExceptionContext,
  ReadOperation,
  WriteOperation,
  MutateOperation,
} from './domain/types/operation.types.js';
export { ExceptionInterface } from './domain/exceptions/interfaces/exception.interface.js';
export { NotAnErrorException } from './domain/exceptions/not-an-error.exception.js';

// Utility types and functions
export { DeepPartial } from './domain/utils/deep-partial.js';
export { mapNonErrorToException } from './infrastructure/utils/map-non-error-to-exception.util.js';
export { toMilliseconds } from './infrastructure/utils/to-milliseconds.js';
export {
  isNil,
  isNumber,
  isObject,
  isString,
  isUndefined,
} from './infrastructure/utils/type-guards.util.js';

// Reference types
export {
  ReferenceActive,
  ReferenceAssignment,
  ReferenceEmail,
  ReferenceId,
  ReferenceSubject,
  ReferenceUsername,
} from './domain/reference/interfaces/reference.types.js';

// Reference interfaces
export { ReferenceActiveInterface } from './domain/reference/interfaces/reference-active.interface.js';
export { ReferenceEmailInterface } from './domain/reference/interfaces/reference-email.interface.js';
export { ReferenceIdInterface } from './domain/reference/interfaces/reference-id.interface.js';
export { ReferenceSubjectInterface } from './domain/reference/interfaces/reference-subject.interface.js';
export { ReferenceUsernameInterface } from './domain/reference/interfaces/reference-username.interface.js';
export { ReferenceVersionInterface } from './domain/reference/interfaces/reference-version.interface.js';

// Audit types
export {
  AuditDateCreated,
  AuditDateDeleted,
  AuditDateUpdated,
  AuditVersion,
} from './domain/audit/interfaces/audit.types.js';

// Audit interfaces
export { AuditDateCreatedInterface } from './domain/audit/interfaces/audit-date-created.interface.js';
export { AuditDateDeletedInterface } from './domain/audit/interfaces/audit-date-deleted.interface.js';
export { AuditDateUpdatedInterface } from './domain/audit/interfaces/audit-date-updated.interface.js';
export { AuditVersionInterface } from './domain/audit/interfaces/audit-version.interface.js';
export { AuditInterface } from './domain/audit/interfaces/audit.interface.js';

// exception types
export {
  RuntimeExceptionContext,
  RuntimeExceptionFault,
} from './domain/exceptions/exception.types.js';

// exception interfaces
export { RuntimeExceptionOptions } from './domain/exceptions/interfaces/runtime-exception-options.interface.js';
export { RuntimeExceptionInterface } from './domain/exceptions/interfaces/runtime-exception.interface.js';

// exceptions
export { RuntimeException } from './domain/exceptions/runtime.exception.js';

// Hook interfaces and types
export { SpecificationInterface } from './infrastructure/hook/interfaces/specification.interface.js';
export { HookOption, HookWithSpec } from './infrastructure/hook/hook.types.js';

// Context host and decorators
export { AppContextHost } from './infrastructure/context/app-context.host.js';
export { getAppContext } from './infrastructure/context/get-app-context.util.js';
export { Ctx } from './infrastructure/context/ctx.decorator.js';

// Context primitives
export { OverlayRef } from './domain/context/overlay-ref.js';
export type { AppContextLike } from './domain/context/app-context-like.type.js';
export { OverlayNotDefinedException } from './infrastructure/context/exceptions/overlay-not-defined.exception.js';

// Context overlay utilities
export { ContextOverlayInterceptor } from './infrastructure/context/context-overlay.interceptor.js';

// Context interfaces
export { AppContextInterface } from './domain/context/interfaces/app-context.interface.js';
export { HookContextInterface } from './infrastructure/context/interfaces/hook-context.interface.js';

// Correlation context
export {
  CorrelationCtx,
  CorrelationContextOverlay,
} from './infrastructure/context/correlation-context.overlay.js';
export { CorrelationContextInterface } from './infrastructure/context/interfaces/correlation-context.interface.js';

// Event context
export { EventContextHost } from './domain/events/causal-context/event-context.host.js';
export { EventContextInterface } from './domain/events/causal-context/interfaces/event-context.interface.js';
export { EventContextHeadersInterface } from './domain/events/causal-context/causal-context-headers.interface.js';
export {
  CausalContextResolver,
  CausalPairInterface,
} from './domain/events/causal-context/causal-context-resolver.interface.js';
export { createCausalContext } from './domain/events/causal-context/create-causal-context.js';
export { AppContextHostCausalResolver } from './domain/events/app-context-host-causal-resolver.js';
export { createEventContext } from './domain/events/create-event-context.js';

// Top-level module
export { CoreModule } from './core.module.js';

// Hook feature
export {
  HookTypeInterface,
  HookMethodMetadataInterface,
  HookMethodFilter,
} from './infrastructure/hook/hook.interfaces.js';
export type { HookMethodKeyType } from './infrastructure/hook/decorators/hook-method.decorator.js';
export { Spec } from './infrastructure/hook/specification/spec.factory.js';
export { CompositeSpecification } from './infrastructure/hook/specification/composite-specification.js';
export { AlwaysSpecification } from './infrastructure/hook/specification/specifications/always.specification.js';
export { NeverSpecification } from './infrastructure/hook/specification/specifications/never.specification.js';
export { AndSpecification } from './infrastructure/hook/specification/specifications/and.specification.js';
export { OrSpecification } from './infrastructure/hook/specification/specifications/or.specification.js';
export { NotSpecification } from './infrastructure/hook/specification/specifications/not.specification.js';
export { HookResolverService } from './infrastructure/hook/hook.resolver.service.js';
export { UseHooks } from './infrastructure/hook/decorators/use-hooks.decorator.js';
export { Hook } from './infrastructure/hook/decorators/hook.decorator.js';
export { Specification } from './infrastructure/hook/decorators/specification.decorator.js';
export { createHookMethodDecorator } from './infrastructure/hook/decorators/hook-method.decorator.js';
export { HooksCtx } from './infrastructure/hook/hook.context.overlay.js';
export { HookNotDecoratedException } from './infrastructure/hook/exceptions/hook-not-decorated.exception.js';
export { HookProviderNotFoundException } from './infrastructure/hook/exceptions/hook-provider-not-found.exception.js';
