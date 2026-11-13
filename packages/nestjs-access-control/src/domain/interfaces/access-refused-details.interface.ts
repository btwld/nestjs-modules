import { type Actor } from '@concepta/nestjs-core';

import { type AccessRefusalReason } from './access-refusal-reason.type.js';

export interface AccessRefusedDetailsInterface {
  action: string;
  subject: string;
  reason: AccessRefusalReason;
  actor?: Actor;
  field?: string;
  /**
   * The decision still pending, when the refusal is one: the authority
   * refused for one, or every deny that refused carries a `reason`.
   */
  gate?: string;
}
