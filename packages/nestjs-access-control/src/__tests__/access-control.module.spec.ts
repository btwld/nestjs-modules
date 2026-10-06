import { AccessControl } from 'accesscontrol';

import { Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
  ACCESS_CONTROL_PORT_TOKEN,
} from '../access-control.constants.js';
import { AccessControlModule } from '../access-control.module.js';
import { AccessControlPort } from '../application/ports/access-control.port.js';
import { CheckAccessHandler } from '../application/queries/handlers/check-access.handler.js';
import { FilterResponseAttributesHandler } from '../application/queries/handlers/filter-response-attributes.handler.js';
import { ResolveUserRolesHandler } from '../application/queries/handlers/resolve-user-roles.handler.js';
import { AccessControlServiceInterface } from '../domain/ports/access-control-service.interface.js';
import { AccessControlSettingsInterface } from '../infrastructure/config/interfaces/access-control-settings.interface.js';
import { AccessControlService } from '../infrastructure/services/access-control.service.js';

describe('AccessControlModule', () => {
  let accessControlModule: AccessControlModule;
  let accessControlSettings: AccessControlSettingsInterface;
  let accessControlService: AccessControlServiceInterface;
  let accessControlPort: AccessControlPort;
  let checkAccessHandler: CheckAccessHandler;
  let filterResponseAttributesHandler: FilterResponseAttributesHandler;
  let resolveUserRolesHandler: ResolveUserRolesHandler;

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
    accessControlPort = testModule.get<AccessControlPort>(
      ACCESS_CONTROL_PORT_TOKEN,
    );
    checkAccessHandler = testModule.get<CheckAccessHandler>(CheckAccessHandler);
    filterResponseAttributesHandler =
      testModule.get<FilterResponseAttributesHandler>(
        FilterResponseAttributesHandler,
      );
    resolveUserRolesHandler = testModule.get<ResolveUserRolesHandler>(
      ResolveUserRolesHandler,
    );
  }

  function commonTests() {
    it('providers should be loaded', async () => {
      expect(accessControlModule).toBeInstanceOf(AccessControlModule);
      expect(accessControlService).toBeInstanceOf(AccessControlService);
    });

    it('port should be loaded under ACCESS_CONTROL_PORT_TOKEN', async () => {
      expect(accessControlPort).toBeInstanceOf(AccessControlPort);
    });

    it('query handlers should be registered', async () => {
      expect(checkAccessHandler).toBeInstanceOf(CheckAccessHandler);
      expect(filterResponseAttributesHandler).toBeInstanceOf(
        FilterResponseAttributesHandler,
      );
      expect(resolveUserRolesHandler).toBeInstanceOf(ResolveUserRolesHandler);
    });
  }
});
