import { AccessControl } from 'accesscontrol';

import { Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AccessControlModule } from './access-control.module';
import { ACCESS_CONTROL_MODULE_SETTINGS_TOKEN } from './constants';
import { AccessControlServiceInterface } from './interfaces/access-control-service.interface';
import { AccessControlSettingsInterface } from './interfaces/access-control-settings.interface';
import { AccessControlService } from './services/access-control.service';

describe('AccessControlModule', () => {
  let accessControlModule: AccessControlModule;
  let accessControlSettings: AccessControlSettingsInterface;
  let accessControlService: AccessControlServiceInterface;

  const rules = new AccessControl();

  describe(AccessControlModule.register, () => {
    beforeAll(async () => {
      const testModule = await Test.createTestingModule({
        imports: [
          AccessControlModule.register({
            settings: { rules },
          }),
        ],
      }).compile();

      setVars(testModule);
    });

    commonTests();

    it('settings should be correct', async () => {
      expect(accessControlSettings).toEqual({
        rules,
      });
    });
  });

  describe(AccessControlModule.forRoot, () => {
    beforeAll(async () => {
      const testModule = await Test.createTestingModule({
        imports: [AccessControlModule.forRoot({ settings: { rules } })],
      }).compile();

      setVars(testModule);
    });

    commonTests();

    it('settings should be correct', async () => {
      expect(accessControlSettings).toEqual({
        rules,
      });
    });
  });

  describe(AccessControlModule.registerAsync, () => {
    beforeEach(async () => {
      const testModule = await Test.createTestingModule({
        imports: [
          AccessControlModule.registerAsync({
            useFactory: () => ({ settings: { rules } }),
          }),
        ],
      }).compile();

      setVars(testModule);
    });

    commonTests();

    it('settings should be correct', async () => {
      expect(accessControlSettings).toEqual({
        rules,
      });
    });
  });

  describe(AccessControlModule.forRootAsync, () => {
    beforeEach(async () => {
      const testModule = await Test.createTestingModule({
        imports: [
          AccessControlModule.forRootAsync({
            useFactory: () => ({ settings: { rules } }),
          }),
        ],
      }).compile();

      setVars(testModule);
    });

    commonTests();

    it('settings should be correct', async () => {
      expect(accessControlSettings).toEqual({
        rules,
      });
    });
  });

  describe(AccessControlModule.forFeature, () => {
    const featureRules = new AccessControl();

    class TestService extends AccessControlService {}

    @Module({
      imports: [AccessControlModule.forRoot({ settings: { rules } })],
    })
    class AppGlobalTest {}

    @Module({
      imports: [
        AppGlobalTest,
        AccessControlModule.forFeature({
          service: new TestService(),
          settings: { rules: featureRules },
        }),
      ],
    })
    class AppFeatureTest {}

    beforeAll(async () => {
      const testModule = await Test.createTestingModule({
        imports: [AppFeatureTest],
      }).compile();

      setVars(testModule);
    });

    commonTests();

    it('providers should be overriden', async () => {
      expect(accessControlService).toBeInstanceOf(TestService);
    });

    it('settings should be overriden', async () => {
      expect(accessControlSettings).toEqual({
        rules: featureRules,
      });
    });
  });

  function setVars(testModule: TestingModule) {
    accessControlModule =
      testModule.get<AccessControlModule>(AccessControlModule);
    accessControlSettings = testModule.get<AccessControlSettingsInterface>(
      ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
    );
    accessControlService =
      testModule.get<AccessControlServiceInterface>(AccessControlService);
  }

  function commonTests() {
    it('providers should be loaded', async () => {
      expect(accessControlModule).toBeInstanceOf(AccessControlModule);
      expect(accessControlSettings).toBeInstanceOf(Object);
      expect(accessControlService).toBeInstanceOf(AccessControlService);
    });
  }
});
