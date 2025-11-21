import { mock } from 'jest-mock-extended';

import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { NotAnErrorException } from '@concepta/nestjs-common';

import { EMAIL_MODULE_MAILER_SERVICE_TOKEN } from './email.constants';
import { EmailService } from './email.service';
import { EmailSendException } from './exceptions/email-send.exception';
import { EmailServiceInterface } from './interfaces/email-service.interface';

describe(EmailService, () => {
  let logger: Logger;
  let emailService: EmailService;
  let mailerService: EmailServiceInterface;

  beforeEach(async () => {
    mailerService = mock<EmailServiceInterface>();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: Logger, useValue: { error: jest.fn() } },
        {
          provide: EMAIL_MODULE_MAILER_SERVICE_TOKEN,
          useValue: mailerService,
        },
      ],
    }).compile();

    logger = moduleRef.get<Logger>(Logger);
    emailService = moduleRef.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(EmailService.prototype.sendMail, () => {
    describe('when sending an email', () => {
      it('should send email without any errors', async () => {
        jest.spyOn(mailerService, 'sendMail').mockImplementation(async () => {
          return undefined;
        });

        const result = await emailService.sendMail({});
        expect(result).toBeUndefined();
        expect(mailerService.sendMail).toHaveBeenCalledTimes(1);
      });
    });

    it('should send email with caught error', async () => {
      expect.hasAssertions();

      jest.spyOn(mailerService, 'sendMail').mockImplementation(async () => {
        throw new Error('Dummy error');
      });

      try {
        await emailService.sendMail({});
      } catch (e) {
        const exception = e instanceof Error ? e : new NotAnErrorException(e);
        expect(exception).toBeInstanceOf(EmailSendException);
        expect(exception.message).toEqual(
          'Fatal error while trying to send email.',
        );
      }

      expect(mailerService.sendMail).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
