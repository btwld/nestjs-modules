import { MailerModule, MailerService } from '@nestjs-modules/mailer';

import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailSendOptionsInterface } from '@concepta/nestjs-common';
import { CrudModule } from '@concepta/nestjs-crud';
import { EmailModule, EmailService } from '@concepta/nestjs-email';
import { EventModule } from '@concepta/nestjs-event';
import { OtpModule, OtpService } from '@concepta/nestjs-otp';
import { PasswordModule } from '@concepta/nestjs-password';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { UserModelService, UserModule } from '@concepta/nestjs-user';

import { InvitationAcceptedEventAsync } from '../events/invitation-accepted.event';
import { InvitationModule } from '../invitation.module';

import { InvitationAcceptanceController } from './controllers/invitation-acceptance.controller';
import { InvitationReattemptController } from './controllers/invitation-reattempt.controller';
import { InvitationController } from './controllers/invitation.controller';
import { InvitationEntityFixture } from './invitation/entities/invitation.entity.fixture';
import { InvitationCrudService } from './invitation-crud.service';
import { InvitationTypeOrmCrudAdapter } from './invitation-typeorm-crud.adapter';
import { default as ormConfig } from './ormconfig.fixture';
import { UserOtpEntityFixture } from './user/entities/user-otp.entity.fixture';
import { UserEntityFixture } from './user/entities/user.entity.fixture';

@Module({
  imports: [
    EventModule.forRoot({}),
    TypeOrmExtModule.forRoot(ormConfig),
    TypeOrmModule.forFeature([
      InvitationEntityFixture,
      UserEntityFixture,
      UserOtpEntityFixture,
    ]),
    CrudModule.forRoot({}),
    MailerModule.forRoot({ transport: { host: '' } }),
    EmailModule.forRootAsync({
      inject: [MailerService],
      useFactory: (mailerService: MailerService) => ({ mailerService }),
    }),
    InvitationModule.registerAsync({
      imports: [
        TypeOrmExtModule.forFeature({
          invitation: {
            entity: InvitationEntityFixture,
          },
        }),
      ],
      inject: [UserModelService, OtpService, EmailService],
      useFactory: (userModelService, otpService, emailService) => ({
        userModelService,
        otpService,
        emailService,
      }),
    }),
    OtpModule.forRootAsync({
      imports: [
        TypeOrmExtModule.forFeature({
          'user-otp': {
            entity: UserOtpEntityFixture,
          },
        }),
      ],
      useFactory: () => ({}),
      entities: ['user-otp'],
    }),
    PasswordModule.forRoot({}),
    UserModule.forRootAsync({
      imports: [
        TypeOrmExtModule.forFeature({
          user: {
            entity: UserEntityFixture,
          },
        }),
      ],
      useFactory: () => ({
        settings: {
          invitationAcceptedEvent: InvitationAcceptedEventAsync,
        },
      }),
    }),
    EmailModule.register({
      mailerService: {
        sendMail(sendMailOptions: EmailSendOptionsInterface): Promise<void> {
          Logger.debug('email sent', sendMailOptions);

          return Promise.resolve();
        },
      },
    }),
  ],
  providers: [
    InvitationCrudService,
    InvitationTypeOrmCrudAdapter,
    {
      provide: Logger,
      useValue: {
        log: jest.fn(),
        debug: jest.fn(async (arg1, arg2) => {
          return { arg1, arg2 };
        }),
      },
    },
  ],
  controllers: [
    InvitationController,
    InvitationAcceptanceController,
    InvitationReattemptController,
  ],
})
export class AppCrudModuleFixture {}
