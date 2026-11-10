export const ACCESS_REFUSAL_REASONS = [
  'no-actor',
  'no-grant',
  'denied',
  'field',
  'access-query',
  'own-unchecked',
] as const;

/**
 * Why a call was refused:
 *
 * - `no-actor`: nobody is acting;
 * - `no-grant`: no rule allows it;
 * - `denied`: a deny rule refuses it;
 * - `field`: a field it touches is refused;
 * - `access-query`: a route's access query service refused it;
 * - `own-unchecked`: only an `own` grant allows it, and the route neither
 *   checks ownership with an access query service nor declares that its
 *   handler does.
 */
export type AccessRefusalReason = (typeof ACCESS_REFUSAL_REASONS)[number];
