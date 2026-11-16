import { Test, type TestingModule } from '@nestjs/testing';

import { InvitationNotificationPort } from '../domain/ports/invitation-notification.port.js';
import { InvitationOtpPort } from '../domain/ports/invitation-otp.port.js';
import { InvitationUserPort } from '../domain/ports/invitation-user.port.js';
import { InvitationService } from '../domain/services/invitation.service.js';
import { AppCrudModuleFixture } from '../gateways/http/__tests__/fixtures/app-crud.module.fixture.js';
import { InvitationMapper } from '../infrastructure/persistence/invitation.mapper.js';
import { InvitationModule } from '../invitation.module.js';

describe(InvitationModule.name, () => {
  let testModule: TestingModule;

  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [AppCrudModuleFixture],
    }).compile();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await testModule.close();
  });

  it('should be loaded', () => {
    const module = testModule.get<InvitationModule>(InvitationModule);
    expect(module).toBeInstanceOf(InvitationModule);
  });

  it('should resolve InvitationService', () => {
    const service = testModule.get<InvitationService>(InvitationService);
    expect(service).toBeInstanceOf(InvitationService);
  });

  it('should resolve InvitationOtpPort', () => {
    const port = testModule.get<InvitationOtpPort>(InvitationOtpPort);
    expect(port).toBeInstanceOf(InvitationOtpPort);
  });

  it('should resolve InvitationUserPort', () => {
    const port = testModule.get<InvitationUserPort>(InvitationUserPort);
    expect(port).toBeInstanceOf(InvitationUserPort);
  });

  it('should resolve InvitationNotificationPort', () => {
    const port = testModule.get<InvitationNotificationPort>(
      InvitationNotificationPort,
    );
    expect(port).toBeInstanceOf(InvitationNotificationPort);
  });

  it('should resolve InvitationMapper', () => {
    const mapper = testModule.get<InvitationMapper>(InvitationMapper);
    expect(mapper).toBeInstanceOf(InvitationMapper);
  });
});
