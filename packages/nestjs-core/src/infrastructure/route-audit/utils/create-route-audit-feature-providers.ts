import { type Provider } from '@nestjs/common';

import { RouteAuditService } from '../route-audit.service.js';

export function createRouteAuditFeatureProviders(): Provider[] {
  return [RouteAuditService];
}
