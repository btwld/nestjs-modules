import { type Actor } from '../../domain/authority/interfaces/actor.type.js';
import { OverlayRef } from '../../domain/context/overlay-ref.js';

/**
 * Who is acting on this call.
 *
 * Define it once per call, immutably, from whatever established the actor
 * (authentication, a queue consumer, a job):
 *
 * ```typescript
 * ctx.defineOverlay(ActorCtx, actor, { immutable: true });
 * ```
 *
 * Freezing is one level deep, so freeze a role actor's `roles` too if
 * anything else holds that array.
 */
export const ActorCtx = new OverlayRef<'withActor', Actor>('withActor');
