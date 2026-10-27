import { type PlainLiteralObject } from '@nestjs/common';

export interface InvitationDispatchedMetadataInterface extends PlainLiteralObject {
  passcode: string;
  tokenExp: Date;
}
