// the module
export { CrudModule } from './crud.module.js';

// interfaces
export { CrudContextInterface } from './infrastructure/interceptors/interfaces/crud-context.interface.js';
export { CrudParsedQueryInterface } from './infrastructure/request/interfaces/crud-parsed-query.interface.js';
export { CrudResponsePaginatedInterface } from './infrastructure/interfaces/crud-response-paginated.interface.js';
export { CrudResponseMetrics } from './infrastructure/interfaces/crud-response-metrics.interface.js';
export { CrudCreateBatchInterface } from './infrastructure/interfaces/crud-create-batch.interface.js';
export { CrudModuleForFeatureOptionsInterface } from './infrastructure/config/interfaces/crud-module-for-feature-options.interface.js';
export {
  CrudControllerClassOptionsInterface,
  CrudControllerOptionsInterface,
} from './infrastructure/interfaces/crud-controller-options.interface.js';
export { CrudRequestConfig } from './infrastructure/request/interfaces/crud-request-config.interface.js';
export { CrudResponseConfig } from './infrastructure/request/interfaces/crud-response-config.interface.js';
export { CrudParamOptionInterface } from './infrastructure/interfaces/crud-param-option.interface.js';
export { CrudParamsOptionsInterface } from './infrastructure/interfaces/crud-params-options.interface.js';
export { CrudSerializationOptionsInterface } from './infrastructure/interfaces/crud-serialization-options.interface.js';

export { CrudAdapter } from './infrastructure/adapters/crud.adapter.js';

// types
export { CrudAdapterProvider } from './infrastructure/adapters/interfaces/crud-adapter.types.js';

// utility decorators
export { InjectCrudAdapter } from './infrastructure/decorators/util/inject-crud-adapter.decorator.js';

// controller decorators
export { CrudController } from './infrastructure/decorators/controller/crud-controller.decorator.js';

// route decorators
export { CrudList } from './infrastructure/decorators/operations/crud-list.decorator.js';
export { CrudRead } from './infrastructure/decorators/operations/crud-read.decorator.js';
export { CrudCreate } from './infrastructure/decorators/operations/crud-create.decorator.js';
export { CrudCreateBatch } from './infrastructure/decorators/operations/crud-create-batch.decorator.js';
export { CrudUpdate } from './infrastructure/decorators/operations/crud-update.decorator.js';
export { CrudReplace } from './infrastructure/decorators/operations/crud-replace.decorator.js';
export { CrudDelete } from './infrastructure/decorators/operations/crud-delete.decorator.js';
export { CrudSoftDelete } from './infrastructure/decorators/operations/crud-soft-delete.decorator.js';
export { CrudRestore } from './infrastructure/decorators/operations/crud-restore.decorator.js';

// route option decorators
export { CrudAllow } from './infrastructure/decorators/routes/crud-allow.decorator.js';
export { CrudCache } from './infrastructure/decorators/routes/crud-cache.decorator.js';
export { CrudCommand } from './infrastructure/decorators/routes/crud-command.decorator.js';
export { CrudCommandHandler } from './infrastructure/decorators/routes/crud-command-handler.decorator.js';
export { CrudExclude } from './infrastructure/decorators/routes/crud-exclude.decorator.js';
export { CrudFilter } from './infrastructure/decorators/routes/crud-filter.decorator.js';
export { CrudJoin } from './infrastructure/decorators/routes/crud-join.decorator.js';
export { CrudLimit } from './infrastructure/decorators/routes/crud-limit.decorator.js';
export { CrudMaxLimit } from './infrastructure/decorators/routes/crud-max-limit.decorator.js';
export { CrudEntity } from './infrastructure/decorators/routes/crud-entity.decorator.js';
export { CrudName } from './infrastructure/decorators/routes/crud-name.decorator.js';
export { CrudParams } from './infrastructure/decorators/routes/crud-params.decorator.js';
export { CrudPersist } from './infrastructure/decorators/routes/crud-persist.decorator.js';
export { CrudQuery } from './infrastructure/decorators/routes/crud-query.decorator.js';
export { CrudQueryHandler } from './infrastructure/decorators/routes/crud-query-handler.decorator.js';
export { CrudRequestBody } from './infrastructure/decorators/routes/crud-request-body.decorator.js';
export { CrudRequestBodyBatch } from './infrastructure/decorators/routes/crud-request-body-batch.decorator.js';
export { CrudResponseResource } from './infrastructure/decorators/routes/crud-response-resource.decorator.js';
export { CrudResponsePaginated } from './infrastructure/decorators/routes/crud-response-paginated.decorator.js';
export { CrudReturnDeleted } from './infrastructure/decorators/routes/crud-return-deleted.decorator.js';
export { CrudReturnRestored } from './infrastructure/decorators/routes/crud-return-restored.decorator.js';
export { CrudSerialize } from './infrastructure/decorators/routes/crud-serialize.decorator.js';
export { CrudSort } from './infrastructure/decorators/routes/crud-sort.decorator.js';
export { CrudValidate } from './infrastructure/decorators/routes/crud-validate.decorator.js';
export { CrudQueryParamsApi } from './infrastructure/decorators/routes/crud-query-params-api.decorator.js';
// interceptors
export {
  CrudContextOverlay,
  CrudCtx,
} from './infrastructure/interceptors/crud-context.overlay.js';

// param decorators
export { CrudBody } from './infrastructure/decorators/params/crud-body.decorator.js';
export { CrudQueryParams } from './infrastructure/decorators/params/crud-query-params.decorator.js';

// api decorators
export { CrudApiBody } from './infrastructure/decorators/openapi/crud-api-body.decorator.js';
export { CrudApiOperation } from './infrastructure/decorators/openapi/crud-api-operation.decorator.js';
export { CrudApiParam } from './infrastructure/decorators/openapi/crud-api-param.decorator.js';
export { CrudApiQuery } from './infrastructure/decorators/openapi/crud-api-query.decorator.js';
export { CrudApiResponse } from './infrastructure/decorators/openapi/crud-api-response.decorator.js';

// schemas (Zod / Standard Schema)
export { paginatedSchema } from './infrastructure/schemas/crud-response-paginated.schema.js';
export { createBatchSchema } from './infrastructure/schemas/crud-create-batch.schema.js';

// exceptions
export { CrudException } from './infrastructure/exceptions/crud.exception.js';
export { CrudContextException } from './infrastructure/exceptions/crud-context.exception.js';
export { CrudDecoratorException } from './infrastructure/exceptions/crud-decorator.exception.js';
export { CrudQueryException } from './infrastructure/exceptions/crud-query.exception.js';

// configurable crud builder
export {
  ConfigurableCrudClassesMap,
  ConfigurableCrudHost,
} from './infrastructure/utils/interfaces/configurable-crud-host.interface.js';
export {
  ConfigurableCrudClassOptions,
  ConfigurableCrudHybridOptions,
  ConfigurableCrudGeneratedOptions,
  ConfigurableCrudOptions,
} from './infrastructure/utils/interfaces/configurable-crud-options.interface.js';
export { ConfigurableCrudBuilder } from './infrastructure/utils/configurable-crud.builder.js';
export {
  ConfigurableCrudOptionsTransformer,
  CrudSchema,
  CrudValidationOptions,
} from './crud.types.js';

// operation types
export { CrudOperationOptions } from './infrastructure/utils/crud-operation-options.type.js';
export { Operation } from '@concepta/nestjs-core';

// specifications
export { CrudSpecContextInterface } from './infrastructure/specifications/interfaces/crud-spec-context.interface.js';
export { CrudSpec } from './infrastructure/specifications/crud-spec.factory.js';
export { OperationSpecification } from './infrastructure/specifications/operation.specification.js';
export { ActionSpecification } from './infrastructure/specifications/action.specification.js';

// resolvers
export { CrudResolverInterface } from './infrastructure/resolvers/interfaces/crud-resolver.interface.js';
export { CrudAdapterResolver } from './infrastructure/resolvers/crud-adapter.resolver.js';
export { CrudOperationResolver } from './infrastructure/resolvers/crud-operation.resolver.js';
export { CrudCqrsResolver } from './infrastructure/resolvers/crud-cqrs.resolver.js';
export { CrudResolver } from './infrastructure/decorators/routes/crud-resolver.decorator.js';

// operations (queries/commands)
export { CrudListQuery } from './application/queries/impl/crud-list.query.js';
export { CrudReadQuery } from './application/queries/impl/crud-read.query.js';
export { CrudCreateCommand } from './application/commands/impl/crud-create.command.js';
export { CrudCreateBatchCommand } from './application/commands/impl/crud-create-batch.command.js';
export { CrudUpdateCommand } from './application/commands/impl/crud-update.command.js';
export { CrudReplaceCommand } from './application/commands/impl/crud-replace.command.js';
export { CrudDeleteCommand } from './application/commands/impl/crud-delete.command.js';
export { CrudSoftDeleteCommand } from './application/commands/impl/crud-soft-delete.command.js';
export { CrudRestoreCommand } from './application/commands/impl/crud-restore.command.js';
export { CrudWithBodyCommand } from './application/commands/impl/crud-with-body.command.js';

// operations (handlers)
export { CrudListHandler } from './application/queries/handlers/crud-list.handler.js';
export { CrudReadHandler } from './application/queries/handlers/crud-read.handler.js';
export { CrudCreateHandler } from './application/commands/handlers/crud-create.handler.js';
export { CrudCreateBatchHandler } from './application/commands/handlers/crud-create-batch.handler.js';
export { CrudUpdateHandler } from './application/commands/handlers/crud-update.handler.js';
export { CrudReplaceHandler } from './application/commands/handlers/crud-replace.handler.js';
export { CrudDeleteHandler } from './application/commands/handlers/crud-delete.handler.js';
export { CrudSoftDeleteHandler } from './application/commands/handlers/crud-soft-delete.handler.js';
export { CrudRestoreHandler } from './application/commands/handlers/crud-restore.handler.js';

// Base handler classes for consumers to extend when writing custom handlers.
export { CrudCommandBaseHandler } from './application/commands/handlers/crud-command-base.handler.js';
export { CrudQueryBaseHandler } from './application/queries/handlers/crud-query-base.handler.js';
export { CrudCommandInterface } from './application/commands/interfaces/crud-command.interface.js';
export { CrudQueryInterface } from './application/queries/interfaces/crud-query.interface.js';
