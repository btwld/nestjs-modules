import { OverlayRef } from '@concepta/nestjs-core';

import { type AccessDecisionInterface } from '../../domain/interfaces/access-decision.interface.js';

/**
 * The grant a route was let through on. Internal: defined by
 * `AccessControlGuard`, read by `AccessControlFilter` and, through
 * `AccessCtxDecisionSource`, by `AccessControlService.assertFields` and
 * `AccessControlService.decision`.
 */
export const AccessDecisionCtx = new OverlayRef<
  'withAccessDecision',
  AccessDecisionInterface
>('withAccessDecision');
