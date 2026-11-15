import { DiscoveryService } from '@nestjs/core';

/**
 * Registers a provider as a route audit rule. The class implements
 * `RouteAuditRuleInterface` and is provided by any module; the route audit
 * finds it at startup.
 *
 * @example
 * ```ts
 * @Injectable()
 * @RouteAuditRuleProvider()
 * export class RequireTenantRule implements RouteAuditRuleInterface {
 *   readonly name = 'requireTenant';
 *
 *   audit(subject: RouteAuditSubjectInterface) {
 *     return subject.routes
 *       .filter((route) => !route.guards.includes(TenantGuard))
 *       .map((route) => ({ route: route.id, message: 'no TenantGuard' }));
 *   }
 * }
 * ```
 */
export const RouteAuditRuleProvider = DiscoveryService.createDecorator<void>();
