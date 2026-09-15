import { type ReferenceIdInterface } from './reference-id.interface';

/**
 * References roles.
 */
export interface ReferenceRolesInterface<
  T extends ReferenceIdInterface = ReferenceIdInterface,
> {
  roles: T[];
}
