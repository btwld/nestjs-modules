import { type ReferenceIdInterface } from '@concepta/nestjs-core';

export interface IdentityInterface {
  provider: string;
  subject: string;
  user: ReferenceIdInterface;
}
