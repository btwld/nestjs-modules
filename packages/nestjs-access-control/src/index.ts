// Module facade + options
export { AccessControlModule } from './access-control.module.js';
export {
  AccessControlOptions,
  AccessControlAsyncOptions,
} from './access-control.module-definition.js';

// Constants
export { ACCESS_CONTROL_MODULE_SETTINGS_TOKEN } from './access-control.constants.js';

// Gateways
export { AccessControlGuard } from './gateways/http/access-control.guard.js';
export { AccessControlFilter } from './gateways/http/access-control.filter.js';
export { ActorCtxResolver } from './gateways/actor-ctx.resolver.js';
export { AccessCtxDecisionSource } from './gateways/access-ctx-decision.source.js';
export { AccessContextOverlay } from './gateways/access-context.overlay.js';

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

// Domain
export { AccessControlContext } from './domain/access-control.context.js';
export { CanAccess } from './domain/interfaces/can-access.interface.js';
export { accessGrantsProblems } from './domain/utils/access-rule-problems.util.js';
export { createAccessAbility } from './domain/utils/create-access-ability.util.js';
export { AccessControlService } from './domain/services/access-control.service.js';
export { AccessControlException } from './domain/exceptions/access-control.exception.js';
export { AccessRefusedException } from './domain/exceptions/access-refused.exception.js';
export { AccessRulesInvalidException } from './domain/exceptions/access-rules-invalid.exception.js';
export {
  accessFieldPaths,
  normalizeAccessFieldPath,
} from './domain/utils/access-field-paths.util.js';
export { AccessAbility } from './domain/interfaces/access-ability.type.js';
export { AccessActorResolverInterface } from './domain/interfaces/access-actor-resolver.interface.js';
export { AccessCheckOptionsInterface } from './domain/interfaces/access-check-options.interface.js';
export { AccessControlAuthorityInterface } from './domain/interfaces/access-control-authority.interface.js';
export { AccessControlContextInterface } from './domain/interfaces/access-control-context.interface.js';
export { AccessControlGrantOptionInterface } from './domain/interfaces/access-control-grant-option.interface.js';
export { AccessControlQueryOptionInterface } from './domain/interfaces/access-control-query-option.interface.js';
export { AccessDecisionInterface } from './domain/interfaces/access-decision.interface.js';
export { AccessDecisionSourceInterface } from './domain/interfaces/access-decision-source.interface.js';
export { AccessGrants } from './domain/interfaces/access-grants.type.js';
export { AccessGrantsProviderInterface } from './domain/interfaces/access-grants-provider.interface.js';
export { AccessQueryInterface } from './domain/interfaces/access-query.interface.js';
export {
  ACCESS_REFUSAL_REASONS,
  AccessRefusalReason,
} from './domain/interfaces/access-refusal-reason.type.js';
export { AccessRefusedDetailsInterface } from './domain/interfaces/access-refused-details.interface.js';
export { AccessResolutionInterface } from './domain/interfaces/access-resolution.interface.js';
export { AccessAuthorization } from './domain/interfaces/access-authorization.type.js';

// Infrastructure
export { StaticAccessGrantsProvider } from './infrastructure/grants/static-access-grants.provider.js';
export { AccessControlOptionsInterface } from './infrastructure/config/interfaces/access-control-options.interface.js';
export { AccessControlSettingsInterface } from './infrastructure/config/interfaces/access-control-settings.interface.js';
