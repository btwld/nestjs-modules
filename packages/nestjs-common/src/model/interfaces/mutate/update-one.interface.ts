import { type ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';

export interface UpdateOneInterface<
  T extends ReferenceIdInterface,
  U extends ReferenceIdInterface = T,
> {
  update: (object: T) => Promise<U>;
}
