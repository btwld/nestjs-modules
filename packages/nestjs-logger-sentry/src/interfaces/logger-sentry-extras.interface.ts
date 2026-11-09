import { type RuntimeExceptionInterface } from '@concepta/nestjs-common';

export interface LoggerSentryExtrasInterface extends Partial<
  Pick<RuntimeExceptionInterface, 'errorCode' | 'safeMessage' | 'context'>
> {
  statusCode?: number;
  message?: string | unknown;
}
