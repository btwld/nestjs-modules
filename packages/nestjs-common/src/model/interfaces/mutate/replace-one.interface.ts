import { type ReferenceIdInterface } from '../../../reference/interfaces/reference-id.interface';

export interface ReplaceOneInterface<
  T extends ReferenceIdInterface,
  U extends ReferenceIdInterface = T,
> {
  replace: (object: T) => Promise<U>;
}
