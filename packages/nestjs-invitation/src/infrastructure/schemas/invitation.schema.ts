import { z } from 'zod';

import { conformsTo, withNamedComponent } from '@concepta/nestjs-core';
import { domainAggregateSchema } from '@concepta/nestjs-core/aggregate';

import { type InvitationInterface } from '../../domain/interfaces/invitation.interface.js';

/**
 * `active` is not part of `InvitationInterface` — it's a derived getter on
 * the `Invitation` aggregate (true when both `dateAccepted` and
 * `dateRevoked` are null), never included in `aggregate.toPlain()`. The
 * legacy `InvitationDto` declared it anyway with a `= true` class-property
 * default, so Create/Delete responses (built from `toPlain()`) always
 * rendered the class default `true`, while List/Read responses (built from
 * the real persisted entity column) rendered the actual value.
 * `.default(true)` reproduces that exact behavior faithfully — not fixed
 * here, since no response has ever exercised a revoked/accepted invitation
 * through the Create/Delete path.
 */
export const invitationSchema = withNamedComponent(
  conformsTo<InvitationInterface>()(
    domainAggregateSchema.extend({
      active: z
        .boolean()
        .default(true)
        .meta({ description: 'Whether the invitation is still active' }),
      code: z.string().meta({ description: 'Invitation code' }),
      category: z.string().meta({ description: 'Category of the invitation' }),
      // `.nullish()` (not just `.optional()`) because the persisted column
      // is nullable — List/Read responses (built from the raw entity) can
      // genuinely carry `null`, while Create/Delete responses (built from
      // `aggregate.toPlain()`) only ever carry the object or `undefined`.
      constraints: z
        .record(z.string(), z.unknown())
        .nullish()
        .meta({ description: 'Constraints for the invitation' }),
      userId: z.string().meta({ description: 'User the invitation is for' }),
      dateAccepted: z
        .date()
        .nullable()
        .meta({ description: 'Date the invitation was accepted' }),
      dateRevoked: z
        .date()
        .nullable()
        .meta({ description: 'Date the invitation was revoked' }),
    }),
  ),
  'Invitation',
);
