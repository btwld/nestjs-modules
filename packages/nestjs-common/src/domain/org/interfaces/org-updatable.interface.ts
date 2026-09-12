import { type OrgInterface } from './org.interface';

export interface OrgUpdatableInterface
  extends
    Pick<OrgInterface, 'id'>,
    Partial<Pick<OrgInterface, 'ownerId' | 'name' | 'active'>> {}
