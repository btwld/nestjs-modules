import { type ReferenceId } from '@concepta/nestjs-core';

export interface IdentityInterface {
  provider: string;
  subject: string;
  userId: ReferenceId;
}
