import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { EmailSettingsInterface } from '../interfaces/email-settings.interface';

import { emailSettingsConfig } from './email-settings.config';

describe(emailSettingsConfig.name, () => {
  let testModule: TestingModule;

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('should use fallbacks', async () => {
    testModule = await Test.createTestingModule({
      imports: [ConfigModule.forFeature(emailSettingsConfig)],
    }).compile();

    const settings: EmailSettingsInterface =
      testModule.get<EmailSettingsInterface>(emailSettingsConfig.KEY);

    expect(settings).toMatchObject<EmailSettingsInterface>({});
  });
});
