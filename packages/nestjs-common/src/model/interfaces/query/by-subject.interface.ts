import { type ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';
import { type ReferenceSubject } from '../../../reference/interfaces/reference.types';

export interface BySubjectInterface<
  T = ReferenceSubject,
  U = ReferenceIdInterface,
> {
  bySubject: (subject: T) => Promise<U | null>;
}
