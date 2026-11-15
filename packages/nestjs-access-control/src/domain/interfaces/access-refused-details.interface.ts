import { type Actor } from '@concepta/nestjs-core';

import { type AccessRefusal } from './access-refusal.type.js';

/**
 * Why a call was refused, as `AccessRefusedException` carries it in its
 * `context`, for logs. None of it reaches the response.
 */
export interface AccessRefusedDetailsInterface {
  /** The action refused, such as `delete`. */
  action: string;
  /** The resource the action was on. */
  resource: string;
  /** Which check refused it. */
  refusal: AccessRefusal;
  /** Who asked, identity only; absent when nobody was acting. */
  actor?: Actor;
  /** The refused API fields, when a field refused the call. */
  fields?: string[];
  /**
   * The decision still pending, when the refusal is one: the authority
   * refused for one, or denies of the whole resource refused and every one
   * of them carries a `reason` (the first one's). A deny naming fields
   * reports none.
   */
  gate?: string;
}
