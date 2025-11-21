import { mock } from 'jest-mock-extended';

import { DynamicModule, ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CrudModule } from '@concepta/nestjs-crud';
import { EmailModule, EmailService } from '@concepta/nestjs-email';
import { EventModule } from '@concepta/nestjs-event';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';

import { InvitationEmailServiceInterface } from './interfaces/services/invitation-email-service.interface';
import { InvitationOtpServiceInterface } from './interfaces/services/invitation-otp-service.interface';
import { InvitationSendServiceInterface } from './interfaces/services/invitation-send-service.interface';
import { InvitationServiceInterface } from './interfaces/services/invitation-service.interface';
import { InvitationUserModelServiceInterface } from './interfaces/services/invitation-user-model.service.interface';
import {
  INVITATION_MODULE_OTP_SERVICE_TOKEN,
  INVITATION_MODULE_USER_MODEL_SERVICE_TOKEN,
} from './invitation.constants';
import { InvitationModule } from './invitation.module';
import { InvitationAcceptanceService } from './services/invitation-acceptance.service';
import { InvitationRevocationService } from './services/invitation-revocation.service';
import { InvitationSendService } from './services/invitation-send.service';
import { InvitationService } from './services/invitation.service';

import { MailerServiceFixture } from './__fixtures__/email/mailer.service.fixture';
import { InvitationLocalModuleFixture } from './__fixtures__/invitation/entities/invitation-local.module.fixture';
import { InvitationSendServiceFixture } from './__fixtures__/invitation/entities/invitation-send.service.fixture';
import { InvitationEntityFixture } from './__fixtures__/invitation/entities/invitation.entity.fixture';
import { default as ormConfig } from './__fixtures__/ormconfig.fixture';
import { OtpModuleFixture } from './__fixtures__/otp/otp.module.fixture';
import { OtpServiceFixture } from './__fixtures__/otp/otp.service.fixture';
import { UserModelServiceFixture } from './__fixtures__/user/services/user-model.service.fixture';
import { UserModuleFixture } from './__fixtures__/user/user.module.fixture';

describe(InvitationModule, () => {
  let testModule: TestingModule;
  let invitationModule: InvitationModule;
  let otpService: InvitationOtpServiceInterface;
  let emailService: InvitationEmailServiceInterface;
  let userModelService: InvitationUserModelServiceInterface;
  let invitationService: InvitationServiceInterface;
  let invitationSendService: InvitationSendServiceInterface;
  let invitationAcceptanceService: InvitationAcceptanceService;
  let invitationRevocationService: InvitationRevocationService;

  const mockEmailService = mock<InvitationEmailServiceInterface>();

  describe(InvitationModule.forRoot, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          TypeOrmExtModule.forFeature({
            invitation: {
              entity: InvitationEntityFixture,
            },
          }),
          InvitationModule.forRoot({
            emailService: mockEmailService,
            otpService: new OtpServiceFixture(),
            userModelService: new UserModelServiceFixture(),
            invitationSendService: new InvitationSendServiceFixture(),
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  describe(InvitationModule.forRoot, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          TypeOrmExtModule.forFeature({
            invitation: {
              entity: InvitationEntityFixture,
            },
          }),
          InvitationModule.forRoot({
            emailService: mockEmailService,
            otpService: new OtpServiceFixture(),
            userModelService: new UserModelServiceFixture(),
          }),
        ]),
      ).compile();
    });

    it('check send service type for default send service', async () => {
      invitationSendService = testModule.get<InvitationSendServiceInterface>(
        InvitationSendService,
      );
      // check the default
      expect(invitationSendService).toBeInstanceOf(InvitationSendService);
    });
  });

  afterEach(async () => {
    if (testModule) await testModule.close();
  });

  describe(InvitationModule.register, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          TypeOrmExtModule.forFeature({
            invitation: {
              entity: InvitationEntityFixture,
            },
          }),
          InvitationModule.register({
            emailService: mockEmailService,
            otpService: new OtpServiceFixture(),
            userModelService: new UserModelServiceFixture(),
            invitationSendService: new InvitationSendServiceFixture(),
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  afterEach(async () => {
    if (testModule) await testModule.close();
  });

  describe(InvitationModule.forRootAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          InvitationModule.forRootAsync({
            imports: [
              TypeOrmExtModule.forFeature({
                invitation: {
                  entity: InvitationEntityFixture,
                },
              }),
            ],
            inject: [
              UserModelServiceFixture,
              OtpServiceFixture,
              EmailService,
              InvitationSendServiceFixture,
            ],
            useFactory: (
              userModelService,
              otpService,
              emailService,
              invitationSendService,
            ) => ({
              userModelService,
              otpService,
              emailService,
              invitationSendService,
            }),
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  afterEach(async () => {
    if (testModule) await testModule.close();
  });

  describe(InvitationModule.registerAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          InvitationModule.registerAsync({
            imports: [
              TypeOrmExtModule.forFeature({
                invitation: {
                  entity: InvitationEntityFixture,
                },
              }),
            ],
            inject: [
              UserModelServiceFixture,
              OtpServiceFixture,
              EmailService,
              InvitationSendServiceFixture,
            ],
            useFactory: (
              userModelService,
              otpService,
              emailService,
              invitationSendService,
            ) => ({
              userModelService,
              otpService,
              emailService,
              invitationSendService,
            }),
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  afterEach(async () => {
    if (testModule) await testModule.close();
  });

  function commonVars() {
    invitationModule = testModule.get<InvitationModule>(InvitationModule);

    emailService =
      testModule.get<InvitationEmailServiceInterface>(EmailService);

    otpService = testModule.get<InvitationOtpServiceInterface>(
      INVITATION_MODULE_OTP_SERVICE_TOKEN,
    );

    userModelService = testModule.get<InvitationUserModelServiceInterface>(
      INVITATION_MODULE_USER_MODEL_SERVICE_TOKEN,
    );

    invitationService = testModule.get<InvitationService>(InvitationService);

    invitationSendService = testModule.get<InvitationSendServiceInterface>(
      InvitationSendService,
    );

    invitationAcceptanceService = testModule.get<InvitationAcceptanceService>(
      InvitationAcceptanceService,
    );

    invitationRevocationService = testModule.get<InvitationRevocationService>(
      InvitationRevocationService,
    );
  }

  function commonTests() {
    expect(invitationModule).toBeInstanceOf(InvitationModule);
    expect(otpService).toBeInstanceOf(OtpServiceFixture);
    expect(emailService).toBeInstanceOf(EmailService);
    expect(userModelService).toBeInstanceOf(UserModelServiceFixture);
    expect(invitationService).toBeInstanceOf(InvitationService);
    expect(invitationSendService).toBeInstanceOf(InvitationSendServiceFixture);
    expect(invitationAcceptanceService).toBeInstanceOf(
      InvitationAcceptanceService,
    );
    expect(invitationRevocationService).toBeInstanceOf(
      InvitationRevocationService,
    );
  }
});

function testModuleFactory(
  extraImports: DynamicModule['imports'] = [],
): ModuleMetadata {
  return {
    imports: [
      TypeOrmExtModule.forRoot(ormConfig),
      EventModule.forRoot({}),
      CrudModule.forRoot({}),
      UserModuleFixture,
      OtpModuleFixture,
      InvitationLocalModuleFixture,
      EmailModule.forRoot({ mailerService: new MailerServiceFixture() }),
      ...extraImports,
    ],
  };
}
