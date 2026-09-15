// Module facade + options
export { AccessControlModule } from './access-control.module.js';
export {
  AccessControlOptions,
  AccessControlAsyncOptions,
} from './access-control.module-definition.js';

// Constants
export {
  ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
  ACCESS_CONTROL_PORT_TOKEN,
} from './access-control.constants.js';

// Gateways
export { AccessControlGuard } from './gateways/http/access-control.guard.js';
export { AccessControlFilter } from './gateways/http/access-control.filter.js';

// Decorators
export { AccessControlGrant } from './gateways/decorators/access-control-grant.decorator.js';
export { AccessControlQuery } from './gateways/decorators/access-control-query.decorator.js';
export { AccessControlCreateMany } from './gateways/decorators/access-control-create-many.decorator.js';
export { AccessControlCreateOne } from './gateways/decorators/access-control-create-one.decorator.js';
export { AccessControlDeleteOne } from './gateways/decorators/access-control-delete-one.decorator.js';
export { AccessControlReadMany } from './gateways/decorators/access-control-read-many.decorator.js';
export { AccessControlReadOne } from './gateways/decorators/access-control-read-one.decorator.js';
export { AccessControlRecoverOne } from './gateways/decorators/access-control-recover-one.decorator.js';
export { AccessControlReplaceOne } from './gateways/decorators/access-control-replace-one.decorator.js';
export { AccessControlUpdateOne } from './gateways/decorators/access-control-update-one.decorator.js';

// Domain types
export { AccessControlContext } from './domain/access-control.context.js';
export { PossessionEnum } from './domain/enums/possession.enum.js';
export { CanAccess } from './domain/policies/can-access.policy.js';
export { AccessControlContextInterface } from './domain/interfaces/access-control-context.interface.js';
export { AccessControlGrantOptionInterface } from './domain/interfaces/access-control-grant-option.interface.js';
export { AccessControlQueryOptionInterface } from './domain/interfaces/access-control-query-option.interface.js';
export { AccessControlMetadataInterface } from './domain/interfaces/access-control-metadata.interface.js';
export { AccessControlServiceInterface } from './domain/ports/access-control-service.interface.js';

// Port
export {
  AccessControlPort,
  AccessControlPortSettings,
  CheckAccessQueryInterface,
  FilterResponseAttributesQueryInterface,
  ResolveUserRolesQueryInterface,
} from './application/ports/access-control.port.js';
export { DEFAULT_ACCESS_CONTROL_PORT_SETTINGS } from './access-control.module-definition.js';

// Infrastructure
export { AccessControlService } from './infrastructure/services/access-control.service.js';
export { AccessControlOptionsInterface } from './infrastructure/config/interfaces/access-control-options.interface.js';
export { AccessControlSettingsInterface } from './infrastructure/config/interfaces/access-control-settings.interface.js';

// Application — queries + handlers
export { CheckAccessQuery } from './application/queries/impl/check-access.query.js';
export { FilterResponseAttributesQuery } from './application/queries/impl/filter-response-attributes.query.js';
export { ResolveUserRolesQuery } from './application/queries/impl/resolve-user-roles.query.js';
export { CheckAccessHandler } from './application/queries/handlers/check-access.handler.js';
export { FilterResponseAttributesHandler } from './application/queries/handlers/filter-response-attributes.handler.js';
export { ResolveUserRolesHandler } from './application/queries/handlers/resolve-user-roles.handler.js';

/**
 * @deprecated Kept for v7 consumer compatibility. Will be removed once
 * external callers migrate off it.
 */
export { AccessControllerException } from './domain/exceptions/access-controller.exception.js';
