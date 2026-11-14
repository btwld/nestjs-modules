/** Every {@link AccessRefusal}, for code that checks or lists them. */
export const ACCESS_REFUSALS = [
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
export type AccessRefusal = (typeof ACCESS_REFUSALS)[number];
