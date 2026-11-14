import { type Actor } from '@concepta/nestjs-core';

import { type AccessRefusal } from './access-refusal.type.js';

export interface AccessRefusedDetailsInterface {
  action: string;
  resource: string;
  refusal: AccessRefusal;
  actor?: Actor;
  /** The refused API fields, when a field refused the call. */
  fields?: string[];
  /**
   * The decision still pending, when the refusal is one: the authority
   * refused for one, or every deny that refused carries a `reason`.
   */
  gate?: string;
}
