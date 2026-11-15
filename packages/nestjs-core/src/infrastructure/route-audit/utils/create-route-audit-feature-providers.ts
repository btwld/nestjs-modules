import { type Provider } from '@nestjs/common';

import { RequirePrivateWritesRouteAuditRule } from '../require-private-writes-route-audit.rule.js';
import { RouteAuditService } from '../route-audit.service.js';

export function createRouteAuditFeatureProviders(): Provider[] {
  return [RouteAuditService, RequirePrivateWritesRouteAuditRule];
}
