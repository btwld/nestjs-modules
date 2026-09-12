import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';

export interface InvitationUserRelationInterface<
  T extends ReferenceId = ReferenceId,
> {
  userId: T;
}

export interface InvitationInterface extends InvitationUserRelationInterface {
  code: string;
  category: string;
  constraints?: PlainLiteralObject | null;
  dateAccepted: Date | null;
  dateRevoked: Date | null;
}
