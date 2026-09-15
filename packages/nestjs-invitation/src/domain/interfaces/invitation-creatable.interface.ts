import { type InvitationInterface } from './invitation.interface.js';

export interface InvitationCreatableInterface
  extends
    Pick<InvitationInterface, 'category' | 'userId' | 'code'>,
    Partial<Pick<InvitationInterface, 'constraints'>> {}
