import { type AccessAbility } from '../interfaces/access-ability.type.js';

/**
 * The decision still pending behind a refusal of `action` on `subject`: the
 * first `reason` among the denies of the whole subject, in the order they
 * were given, but only when every one of them has one. A deny without a
 * reason is final, so a refusal it takes part in is never reported as
 * pending. A deny naming fields is left out: it refuses fields, not the
 * subject.
 */
export function accessGateOf(
  ability: AccessAbility,
  action: string,
  subject: string,
): string | undefined {
  // Highest priority first, so the first given is last.
  const reasons = ability
    .rulesFor(action, subject)
    .filter((rule) => rule.inverted)
    .map((rule) => rule.reason);

  return reasons.length > 0 && reasons.every((reason) => reason !== undefined)
    ? reasons.at(-1)
    : undefined;
}
