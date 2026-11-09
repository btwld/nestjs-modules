import { type ReferenceIdInterface } from './reference-id.interface';

export interface ReferenceUserInterface<T = ReferenceIdInterface> {
  user: T;
}
