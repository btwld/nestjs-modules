import { type PlainLiteralObject } from '@nestjs/common';

export interface InvitationAcceptableInterface {
  passcode: string;
  payload?: PlainLiteralObject;
}
