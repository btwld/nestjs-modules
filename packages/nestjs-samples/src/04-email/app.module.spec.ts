import { Test, TestingModule } from '@nestjs/testing';

import { EmailService } from '@concepta/nestjs-email';

import { AppModule } from './app.module';
import { NotificationController } from './notification/notification.controller';

describe('AppModule', () => {
  let notificationController: NotificationController;
  let spyService: jest.SpyInstance;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    notificationController = app.get<NotificationController>(
      NotificationController,
    );

    spyService = jest
      .spyOn(EmailService.prototype, 'sendMail')
      .mockImplementation(() => Promise.resolve());
  });

  describe('Notification Controller', () => {
    it('Create notification', () => {
      notificationController.create({ emailAddress: 'email@email.com' });
      expect(spyService).toHaveBeenCalledTimes(1);
    });
  });
});
