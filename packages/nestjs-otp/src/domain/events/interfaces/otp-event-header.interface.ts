import { type EventContextHeadersInterface } from '@concepta/nestjs-core';

export interface OtpEventHeaderInterface extends EventContextHeadersInterface {
  namespace: string;
}
