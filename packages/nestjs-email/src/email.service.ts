import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotAnErrorException } from '@concepta/nestjs-common';
import { EmailSendOptionsInterface } from '@concepta/nestjs-common';
import { EmailServiceInterface } from './interfaces/email-service.interface';
import { EmailSendException } from './exceptions/email-send.exception';

@Injectable()
export class EmailService implements EmailServiceInterface {
  constructor(
    protected readonly logger: Logger,
    @Inject('EMAIL_MODULE_MAILER_SERVICE_TOKEN')
    protected readonly mailerService: EmailServiceInterface,
  ) {}

  public async sendMail(dto: EmailSendOptionsInterface): Promise<void> {
    try {
      await this.mailerService.sendMail(dto);
    } catch (e) {
      // determine the exception to log
      const exception = e instanceof Error ? e : new NotAnErrorException(e);
      // log the original error
      this.logger.error(exception.message, exception.stack, EmailService.name);
      // throw a more friendly error
      throw new EmailSendException();
    }
  }
}
