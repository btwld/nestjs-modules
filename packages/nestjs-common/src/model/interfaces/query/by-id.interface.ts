import { type ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';
import { type ReferenceId } from '../../../reference/interfaces/reference.types';

export interface ByIdInterface<T = ReferenceId, U = ReferenceIdInterface> {
  byId: (id: T) => Promise<U | null>;
}
