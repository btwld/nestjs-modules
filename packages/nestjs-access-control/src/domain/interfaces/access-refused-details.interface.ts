import { type Actor } from '@concepta/nestjs-core';

import { type AccessRefusalReason } from './access-refusal-reason.type.js';

export interface AccessRefusedDetailsInterface {
  action: string;
  subject: string;
  reason: AccessRefusalReason;
  actor?: Actor;
  field?: string;
  /** The decision still pending, when the authority refused for one. */
  gate?: string;
}
