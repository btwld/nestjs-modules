import { type Actor } from './actor.type.js';

/**
 * Why `assertAuthority` refused, beside the subject and action the
 * exception names.
 */
export interface AuthorityActionRefusedDetailsInterface {
  /**
   * `no-actor` when nobody is acting on the ctx; `authority` when the
   * authority refused.
   */
  refusal: 'no-actor' | 'authority';
  /** Who asked, when anyone did. */
  actor?: Actor;
  /** The decision still pending, when the authority reported one. */
  gate?: string;
}
