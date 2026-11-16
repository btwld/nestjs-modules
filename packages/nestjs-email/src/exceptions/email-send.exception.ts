import { type RuntimeExceptionOptions } from '@concepta/nestjs-common';

import { EmailException } from './email.exception';

export class EmailSendException extends EmailException {
  constructor(options?: RuntimeExceptionOptions) {
    super({
      message: 'Fatal error while trying to send email.',
      ...options,
    });

    this.errorCode = 'EMAIL_SEND_ERROR';
  }
}
