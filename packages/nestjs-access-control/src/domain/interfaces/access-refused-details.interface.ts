import { type AccessActor } from './access-actor.type.js';
import { type AccessRefusalReason } from './access-refusal-reason.type.js';

export interface AccessRefusedDetailsInterface {
  action: string;
  subject: string;
  reason: AccessRefusalReason;
  actor?: AccessActor;
  field?: string;
}
