import { AccessControl } from 'accesscontrol';
import { mock } from 'vitest-mock-extended';

import {
  type ArgumentsHost,
  Controller,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';

import { ActionEnum } from '@concepta/nestjs-core';

import {
  ACCESS_CONTROL_MODULE_QUERY_METADATA,
  ACCESS_CONTROL_MODULE_GRANT_METADATA,
  ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
} from '../../../../access-control.constants.js';
import { AccessControlContext } from '../../../../domain/access-control.context.js';
import { PossessionEnum } from '../../../../domain/enums/possession.enum.js';
import { AccessControlContextInterface } from '../../../../domain/interfaces/access-control-context.interface.js';
import { AccessControlGrantOptionInterface } from '../../../../domain/interfaces/access-control-grant-option.interface.js';
import { AccessControlQueryOptionInterface } from '../../../../domain/interfaces/access-control-query-option.interface.js';
import { CanAccess } from '../../../../domain/policies/can-access.policy.js';
import { AccessControlServiceInterface } from '../../../../domain/ports/access-control-service.interface.js';
import { AccessControlCreateOne } from '../../../../gateways/decorators/access-control-create-one.decorator.js';
import { AccessControlQuery } from '../../../../gateways/decorators/access-control-query.decorator.js';
import { AccessControlReadMany } from '../../../../gateways/decorators/access-control-read-many.decorator.js';
import { AccessControlReadOne } from '../../../../gateways/decorators/access-control-read-one.decorator.js';
import { AccessControlOptionsInterface } from '../../../../infrastructure/config/interfaces/access-control-options.interface.js';
import { AccessControlService } from '../../../../infrastructure/services/access-control.service.js';
import { CheckAccessQuery } from '../../impl/check-access.query.js';
import { CheckAccessHandler } from '../check-access.handler.js';

type HttpArgumentsHost = ReturnType<ArgumentsHost['switchToHttp']>;

describe(CheckAccessHandler.name, () => {
  const resourceNoAccess = 'protected_resource_no_access';
  const resourceGetAny = 'resource_get_any';
  const resourceGetOwn = 'resource_get_own';
  const resourceGetOneOwn = 'resource_get_one_own';
  const resourceCreateOwn = 'resource_create_own';

  class TestUser {
    constructor(public id: number) {}
  }

  @Injectable()
  class TestQueryServicePass implements CanAccess {
    async canAccess(_context: AccessControlContextInterface) {
      return true;
    }
  }

  @Injectable()
  class TestQueryServiceFail implements CanAccess {
    async canAccess(_context: AccessControlContextInterface) {
      return false;
    }
  }

  class TestAccessService implements AccessControlServiceInterface {
    async getUser(_context: ExecutionContext): Promise<TestUser> {
      return new TestUser(1234);
    }
    async getUserRoles(_context: ExecutionContext): Promise<string | string[]> {
      return ['role1'];
    }
  }

  @Controller()
  class TestController {
    getOpen() {
      return undefined;
    }
    @AccessControlReadOne(resourceNoAccess)
    getNoAccess() {
      return undefined;
    }
    @AccessControlReadOne(resourceGetAny)
    getAny() {
      return undefined;
    }
    @AccessControlReadOne(resourceGetOwn)
    getOwn() {
      return undefined;
    }
    @AccessControlReadMany(resourceGetOwn)
    @AccessControlQuery({ service: TestQueryServiceFail })
    getOwnQueryFail() {
      return undefined;
    }
    @AccessControlReadMany(resourceGetOwn)
    @AccessControlQuery({ service: TestQueryServicePass })
    getOwnQueryPass() {
      return undefined;
    }
    @AccessControlCreateOne(resourceCreateOwn)
    @AccessControlQuery({ service: TestQueryServicePass })
    createOwnQueryPass() {
      return undefined;
    }
    @AccessControlReadOne(resourceGetOneOwn)
    @AccessControlQuery({ service: TestQueryServicePass })
    getOneOwnQueryPass() {
      return undefined;
    }
  }

  let controller: TestController;

  const rules = new AccessControl();
  rules.grant('role1').readAny(resourceGetAny);
  rules.grant('role1').readOwn(resourceGetOwn);
  rules.grant('role1').readOwn(resourceGetOneOwn);
  rules.grant('role1').createOwn(resourceCreateOwn);
  rules.lock();

  let moduleRef: TestingModule;
  let handler: CheckAccessHandler;
  let testQueryServicePass: TestQueryServicePass;
  let testQueryServiceFail: TestQueryServiceFail;
  let reflector: Reflector;

  beforeEach(async () => {
    const moduleConfig: AccessControlOptionsInterface = {
      settings: { rules: rules },
      service: new TestAccessService(),
    };

    reflector = new Reflector();

    moduleRef = await Test.createTestingModule({
      providers: [
        CheckAccessHandler,
        TestAccessService,
        TestQueryServicePass,
        TestQueryServiceFail,
        {
          provide: AccessControlService,
          useClass: TestAccessService,
        },
        {
          provide: ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
          useValue: moduleConfig.settings,
        },
        { provide: Reflector, useValue: reflector },
        {
          provide: QueryBus,
          useValue: { execute: vi.fn().mockResolvedValue(['role1']) },
        },
      ],
    }).compile();

    controller = new TestController();
    handler = moduleRef.get<CheckAccessHandler>(CheckAccessHandler);
    testQueryServicePass =
      moduleRef.get<TestQueryServicePass>(TestQueryServicePass);
    testQueryServiceFail =
      moduleRef.get<TestQueryServiceFail>(TestQueryServiceFail);
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe('handler provider', () => {
    it('should be of correct type', async () => {
      expect(handler).toBeInstanceOf(CheckAccessHandler);
    });
  });

  describe('access grants', () => {
    it('should not have any grants set for getOpen', async () => {
      const grants = reflector.get(
        ACCESS_CONTROL_MODULE_GRANT_METADATA,
        controller.getOpen,
      );

      expect(grants).toBeUndefined();
    });

    it('should have grants set for getNoAccess', async () => {
      const grants = reflector.get(
        ACCESS_CONTROL_MODULE_GRANT_METADATA,
        controller.getNoAccess,
      );

      expect(grants).toEqual<AccessControlGrantOptionInterface[]>([
        {
          action: ActionEnum.READ,
          resource: resourceNoAccess,
        },
      ]);
    });

    it('should have grants set for getAny', async () => {
      const grants = reflector.get(
        ACCESS_CONTROL_MODULE_GRANT_METADATA,
        controller.getAny,
      );

      expect(grants).toEqual<AccessControlGrantOptionInterface[]>([
        {
          action: ActionEnum.READ,
          resource: resourceGetAny,
        },
      ]);
    });

    it('should have grants set for getOwn', async () => {
      const grants = reflector.get(
        ACCESS_CONTROL_MODULE_GRANT_METADATA,
        controller.getOwn,
      );

      expect(grants).toEqual<AccessControlGrantOptionInterface[]>([
        {
          action: ActionEnum.READ,
          resource: resourceGetOwn,
        },
      ]);
    });
  });

  describe('access queries', () => {
    it('should have queries set for getOwnQueryFail', async () => {
      const queries = reflector.get(
        ACCESS_CONTROL_MODULE_QUERY_METADATA,
        controller.getOwnQueryFail,
      );

      expect(queries).toEqual<AccessControlQueryOptionInterface[]>([
        {
          service: TestQueryServiceFail,
        },
      ]);
    });

    it('should have query set for getOwnQueryPass', async () => {
      const queries = reflector.get(
        ACCESS_CONTROL_MODULE_QUERY_METADATA,
        controller.getOwnQueryPass,
      );

      expect(queries).toEqual<AccessControlQueryOptionInterface[]>([
        {
          service: TestQueryServicePass,
        },
      ]);
    });
  });

  describe('canActivate', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should allow activation (no acl applied)', async () => {
      const context = mock<ExecutionContext>();
      context.getHandler.mockReturnValue(controller.getOpen);
      const canActivate: boolean = await handler.execute(
        new CheckAccessQuery(context),
      );
      expect(canActivate).toEqual(true);
    });

    it('should NOT allow activation', async () => {
      const context = mock<ExecutionContext>();
      context.getHandler.mockReturnValue(controller.getNoAccess);
      const canActivate: boolean = await handler.execute(
        new CheckAccessQuery(context),
      );
      expect(canActivate).toEqual(false);
    });

    it('should allow activation for read any of resource', async () => {
      const context = mock<ExecutionContext>();
      context.getHandler.mockReturnValue(controller.getAny);
      const canActivate: boolean = await handler.execute(
        new CheckAccessQuery(context),
      );
      expect(canActivate).toEqual(true);
    });

    it('should allow activation for read own of resource', async () => {
      const context = mock<ExecutionContext>();
      context.getHandler.mockReturnValue(controller.getOwn);
      const canActivate: boolean = await handler.execute(
        new CheckAccessQuery(context),
      );
      expect(canActivate).toEqual(true);
    });

    it('should NOT allow activation, request not found on args host', async () => {
      const argsHost = mock<HttpArgumentsHost>();
      argsHost.getRequest.mockReturnValue(null);

      const context = mock<ExecutionContext>();
      context.getClass.mockReturnValue(TestController);
      context.getHandler.mockReturnValue(controller.getOwnQueryPass);
      context.switchToHttp.mockReturnValue(argsHost);

      const querySpy = vi.spyOn(testQueryServicePass, 'canAccess');

      const canActivate: boolean = await handler.execute(
        new CheckAccessQuery(context),
      );
      expect(querySpy).not.toHaveBeenCalled();
      expect(canActivate).toEqual(false);
    });

    it('should NOT allow activation, query string data', async () => {
      const argsHost = mock<HttpArgumentsHost>();
      argsHost.getRequest.mockReturnValue({ query: { foo: 'bar' } });

      const context = mock<ExecutionContext>();
      context.getClass.mockReturnValue(TestController);
      context.getHandler.mockReturnValue(controller.getOwnQueryFail);
      context.switchToHttp.mockReturnValue(argsHost);

      const querySpy = vi.spyOn(testQueryServiceFail, 'canAccess');

      const canActivate: boolean = await handler.execute(
        new CheckAccessQuery(context),
      );
      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(canActivate).toEqual(false);
    });

    it('should allow activation, query string data', async () => {
      const argsHost = mock<HttpArgumentsHost>();

      argsHost.getRequest.mockReturnValue({ query: { q1: 'abc' } });

      const context = mock<ExecutionContext>();
      context.getClass.mockReturnValue(TestController);
      context.getHandler.mockReturnValue(controller.getOwnQueryPass);
      context.switchToHttp.mockReturnValue(argsHost);

      const expectedAccessControlContext = new AccessControlContext({
        request: {
          query: {
            q1: 'abc',
          },
        },
        user: { id: 1234 },
        query: {
          possession: PossessionEnum.OWN,
          resource: 'resource_get_own',
          action: ActionEnum.READ,
          role: ['role1'],
        },
        accessControl: rules,
        executionContext: context,
      });

      const querySpy = vi.spyOn(testQueryServicePass, 'canAccess');

      const canActivate: boolean = await handler.execute(
        new CheckAccessQuery(context),
      );
      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(querySpy).toHaveBeenCalledWith(expectedAccessControlContext);
      expect(canActivate).toEqual(true);
    });

    it('should allow activation, body data', async () => {
      const argsHost = mock<HttpArgumentsHost>();
      argsHost.getRequest.mockReturnValue({ body: { b1: 'xyz' } });

      const context = mock<ExecutionContext>();
      context.getClass.mockReturnValue(TestController);
      context.getHandler.mockReturnValue(controller.createOwnQueryPass);
      context.switchToHttp.mockReturnValue(argsHost);

      const expectedAccessControlContext = new AccessControlContext({
        request: {
          body: { b1: 'xyz' },
        },
        user: { id: 1234 },
        query: {
          possession: PossessionEnum.OWN,
          resource: 'resource_create_own',
          action: ActionEnum.CREATE,
          role: ['role1'],
        },
        accessControl: rules,
        executionContext: context,
      });

      const querySpy = vi.spyOn(testQueryServicePass, 'canAccess');

      const canActivate: boolean = await handler.execute(
        new CheckAccessQuery(context),
      );
      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(querySpy).toHaveBeenCalledWith(expectedAccessControlContext);
      expect(canActivate).toEqual(true);
    });

    it('should allow activation, path data', async () => {
      const argsHost = mock<HttpArgumentsHost>();
      argsHost.getRequest.mockReturnValue({ params: { id: 7890 } });

      const context = mock<ExecutionContext>();
      context.getClass.mockReturnValue(TestController);
      context.getHandler.mockReturnValue(controller.getOneOwnQueryPass);
      context.switchToHttp.mockReturnValue(argsHost);

      const querySpy = vi.spyOn(testQueryServicePass, 'canAccess');

      const expectedAccessControlContext = new AccessControlContext({
        request: {
          params: { id: 7890 },
        },
        user: { id: 1234 },
        query: {
          possession: PossessionEnum.OWN,
          resource: 'resource_get_one_own',
          action: ActionEnum.READ,
          role: ['role1'],
        },
        accessControl: rules,
        executionContext: context,
      });

      const canActivate: boolean = await handler.execute(
        new CheckAccessQuery(context),
      );
      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(querySpy).toHaveBeenCalledWith(expectedAccessControlContext);
      expect(canActivate).toEqual(true);
    });
  });
});
