export const ACCESS_REFUSAL_REASONS = [
  'no-actor',
  'no-grant',
  'denied',
  'field',
  'access-query',
  'authority',
] as const;

/**
 * Why a call was refused:
 *
 * - `no-actor`: nobody is acting;
 * - `no-grant`: no rule allows it;
 * - `denied`: a deny rule refuses it;
 * - `field`: a field it touches is refused;
 * - `access-query`: a route's access query service refused it;
 * - `authority`: the module's authority refuses it.
 */
export type AccessRefusalReason = (typeof ACCESS_REFUSAL_REASONS)[number];
