import { Injectable, Module, type Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';

import { ACCESS_CONTROL_MODULE_SETTINGS_TOKEN } from '../access-control.constants.js';
import {
  type AccessControlOptions,
  createAccessControlAppFilterProvider,
  createAccessControlProviders,
} from '../access-control.module-definition.js';
import { AccessControlModule } from '../access-control.module.js';
import { type AccessActorResolverInterface } from '../domain/interfaces/access-actor-resolver.interface.js';
import { type AccessGrants } from '../domain/interfaces/access-grants.type.js';
import { type CanAccess } from '../domain/interfaces/can-access.interface.js';
import { AccessControlService } from '../domain/services/access-control.service.js';
import { AccessControlFilter } from '../gateways/http/access-control.filter.js';
import { AccessControlGuard } from '../gateways/http/access-control.guard.js';
import { type AccessControlSettingsInterface } from '../infrastructure/config/interfaces/access-control-settings.interface.js';

describe('AccessControlModule', () => {
  const grants: AccessGrants = {
    'role:clerk': [{ action: 'read', subject: 'user' }],
  };

  let settings: AccessControlSettingsInterface;
  let service: AccessControlService;

  function setVars(testModule: TestingModule) {
    settings = testModule.get<AccessControlSettingsInterface>(
      ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
    );
    service = testModule.get(AccessControlService);
  }

  function commonTests() {
    it('registers the service', async () => {
      expect(service).toBeInstanceOf(AccessControlService);
    });

    it('settings should be correct', async () => {
      expect(settings).toEqual({ grants });
    });
  }

  const resolveProviders = async (testModule: TestingModule) => {
    expect(testModule.get(AccessControlGuard)).toBeInstanceOf(
      AccessControlGuard,
    );
    expect(testModule.get(AccessControlFilter)).toBeInstanceOf(
      AccessControlFilter,
    );
  };

  describe(AccessControlModule.register, () => {
    let testModule: TestingModule;

    beforeAll(async () => {
      testModule = await Test.createTestingModule({
        imports: [AccessControlModule.register({ settings: { grants } })],
      }).compile();

      setVars(testModule);
    });

    commonTests();

    it('resolves its providers', () => resolveProviders(testModule));
  });

  describe(AccessControlModule.forRoot, () => {
    beforeAll(async () => {
      const testModule = await Test.createTestingModule({
        imports: [AccessControlModule.forRoot({ settings: { grants } })],
      }).compile();

      setVars(testModule);
    });

    commonTests();
  });

  describe(AccessControlModule.registerAsync, () => {
    beforeAll(async () => {
      const testModule = await Test.createTestingModule({
        imports: [
          AccessControlModule.registerAsync({
            useFactory: () => ({ settings: { grants } }),
          }),
        ],
      }).compile();

      setVars(testModule);
    });

    commonTests();
  });

  describe(AccessControlModule.forRootAsync, () => {
    beforeAll(async () => {
      const testModule = await Test.createTestingModule({
        imports: [
          AccessControlModule.forRootAsync({
            useFactory: () => ({ settings: { grants } }),
          }),
        ],
      }).compile();

      setVars(testModule);
    });

    commonTests();
  });

  describe(AccessControlModule.forFeature, () => {
    const featureGrants: AccessGrants = {
      'system:agile': [{ action: 'approve', subject: 'contract' }],
    };
    const actorResolver: AccessActorResolverInterface = {
      actorFor: async () => ({ kind: 'system', name: 'agile' }),
    };

    @Module({
      imports: [AccessControlModule.forRoot({ settings: { grants } })],
    })
    class AppGlobalTest {}

    @Module({
      imports: [
        AppGlobalTest,
        AccessControlModule.forFeature({
          settings: { grants: featureGrants },
          actorResolver,
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

    it('overrides the settings', () => {
      expect(settings).toEqual({ grants: featureGrants });
    });

    it('uses the feature actor resolver and grants', async () => {
      expect(await service.can({}, 'approve', 'contract')).toEqual(true);
    });
  });

  it('registers no application-wide filter or actor overlay for a feature', () => {
    const actorResolver = { actorFor: async () => undefined };
    const appWide = (providers: Provider[] = []) =>
      providers.filter(
        (provider) =>
          typeof provider === 'object' &&
          'provide' in provider &&
          provider.provide === APP_INTERCEPTOR,
      ).length;

    expect(
      appWide(createAccessControlProviders({ overrides: { actorResolver } })),
    ).toEqual(2);
    expect(
      appWide(AccessControlModule.forFeature({ actorResolver }).providers),
    ).toEqual(0);
  });

  it('registers the access query services given to forFeature', async () => {
    @Injectable()
    class FeatureQuery implements CanAccess {
      async canAccess(): Promise<boolean> {
        return true;
      }
    }

    const testModule = await Test.createTestingModule({
      imports: [
        AccessControlModule.forRoot({ settings: { grants } }),
        AccessControlModule.forFeature({
          settings: { grants },
          queryServices: [FeatureQuery],
        }),
      ],
    }).compile();

    expect(testModule.get(FeatureQuery, { strict: false })).toBeInstanceOf(
      FeatureQuery,
    );
  });

  it('is global from forRoot and forRootAsync only', () => {
    const options = { settings: { grants } };
    const asyncOptions = { useFactory: () => options };

    expect(AccessControlModule.register(options).global).toBe(false);
    expect(AccessControlModule.registerAsync(asyncOptions).global).toBe(false);
    expect(AccessControlModule.forRoot(options).global).toBe(true);
    expect(AccessControlModule.forRootAsync(asyncOptions).global).toBe(true);
  });

  it('adds the imports it is given', () => {
    @Module({})
    class ExtraModule {}

    // toContain passes on undefined, so the whole list is matched.
    expect(
      AccessControlModule.register({ imports: [ExtraModule] }).imports,
    ).toEqual([expect.anything(), ExtraModule]);
    expect(
      AccessControlModule.forFeature({ imports: [ExtraModule] }).imports,
    ).toEqual([expect.anything(), ExtraModule]);
  });

  it('injects into an async factory from the imports it is given', async () => {
    @Injectable()
    class GrantsSource {
      readonly grants = grants;
    }

    @Module({ providers: [GrantsSource], exports: [GrantsSource] })
    class GrantsSourceModule {}

    const testModule = await Test.createTestingModule({
      imports: [
        AccessControlModule.forRootAsync({
          imports: [GrantsSourceModule],
          inject: [GrantsSource],
          useFactory: (source: GrantsSource) => ({
            settings: { grants: source.grants },
          }),
        }),
      ],
    }).compile();

    expect(
      testModule.get<AccessControlSettingsInterface>(
        ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
      ),
    ).toEqual({ grants });
  });

  describe('app filter', () => {
    @Injectable()
    class CustomFilter extends AccessControlFilter {}

    const defaultFilter = new AccessControlFilter();

    const appFilterFor = (
      options: AccessControlOptions,
      overrides?: AccessControlOptions,
    ): unknown => {
      const provider = createAccessControlAppFilterProvider(overrides);

      if (typeof provider !== 'object' || !('useFactory' in provider)) {
        throw new Error('expected a factory provider');
      }

      return provider.useFactory(options, defaultFilter);
    };

    it('is the module filter by default', () => {
      expect(appFilterFor({})).toBe(defaultFilter);
    });

    it('is left out when the options turn it off', () => {
      expect(appFilterFor({ appFilter: false })).toBeNull();
    });

    it('is the filter the options give', () => {
      const custom = new CustomFilter();

      expect(appFilterFor({ appFilter: custom })).toBe(custom);
    });

    it('follows overrides before the options', () => {
      expect(appFilterFor({}, { appFilter: false })).toBeNull();
    });
  });

  it('fails startup on grants keyed by no actor kind', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          AccessControlModule.register({
            settings: {
              grants: { clerk: [{ action: 'read', subject: 'user' }] },
            },
          }),
        ],
      }).compile(),
    ).rejects.toThrow(
      'grants key "clerk": must be role:<name> or system:<name>',
    );
  });
});
