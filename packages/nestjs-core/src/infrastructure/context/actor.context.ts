import { type Actor } from '../../domain/authority/interfaces/actor.type.js';
import { OverlayRef } from '../../domain/context/overlay-ref.js';

/**
 * Who is acting on this call.
 *
 * Define it once per call, immutably, from whatever established the actor
 * (authentication, a queue consumer, a job). `frozenActor` freezes a role
 * actor's `roles` too, which an immutable overlay, frozen one level deep,
 * would leave open to anything else holding that array:
 *
 * ```typescript
 * ctx.defineOverlay(ActorCtx, frozenActor(actor), { immutable: true });
 * ```
 */
export const ActorCtx = new OverlayRef<'withActor', Actor>('withActor');
