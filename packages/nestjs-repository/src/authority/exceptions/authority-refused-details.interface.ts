import { type Actor } from '@concepta/nestjs-core';

/**
 * Why an entity's authority refused a call, beside the entity and the
 * action the exception names.
 */
export interface AuthorityRefusedDetailsInterface {
  /**
   * `no-actor` when the call names no actor; `authority` when the authority
   * refused the action, or a column it names.
   */
  refusal: 'no-actor' | 'authority';
  /** Who asked, when anyone did. */
  actor?: Actor;
  /** The decision still pending, when the authority reported one. */
  gate?: string;
  /** The columns refused, when the refusal is of columns. */
  columns?: string[];
}
