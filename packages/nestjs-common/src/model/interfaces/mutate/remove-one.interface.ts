import { type ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';

export interface RemoveOneInterface<
  T extends ReferenceIdInterface,
  U extends ReferenceIdInterface = T,
> {
  remove: (object: T) => Promise<U>;
}
