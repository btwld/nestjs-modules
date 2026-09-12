import { type ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';
import { type ReferenceEmail } from '../../../reference/interfaces/reference.types';

export interface ByEmailInterface<
  T = ReferenceEmail,
  U = ReferenceIdInterface,
> {
  byEmail: (email: T) => Promise<U | null>;
}
