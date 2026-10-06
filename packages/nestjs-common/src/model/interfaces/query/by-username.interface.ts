import { type ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';
import { type ReferenceUsername } from '../../../reference/interfaces/reference.types';

export interface ByUsernameInterface<
  T = ReferenceUsername,
  U = ReferenceIdInterface,
> {
  byUsername: (username: T) => Promise<U | null>;
}
