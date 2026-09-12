import { AccessControl } from 'accesscontrol';
import supertest from 'supertest';

import {
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';

import { ACCESS_CONTROL_MODULE_SETTINGS_TOKEN } from '../../../access-control.constants.js';
import { AccessControlModule } from '../../../access-control.module.js';
import { AccessControlServiceInterface } from '../../../domain/ports/access-control-service.interface.js';
import { AccessControlOptionsInterface } from '../../../infrastructure/config/interfaces/access-control-options.interface.js';
import { AccessControlService } from '../../../infrastructure/services/access-control.service.js';
import { AccessControlReadOne } from '../../decorators/access-control-read-one.decorator.js';

describe('AccessControlFilter', () => {
  const resourceGetAll = 'resource_get_all';
  const resourceGetOne = 'resource_get_one';
  const USER_1 = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '(407) 123 1234',
    dob: '12/01/1988',
  };
  const USER_2 = {
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '(407) 123 1234',
    dob: '12/01/1988',
  };

  class TestUser {
    constructor(public id: number) {}
  }

  @ApiTags('users')
  @Controller('users')
  class UserController {
    @Get('')
    @AccessControlReadOne(resourceGetAll)
    @ApiResponse({})
    getAny() {
      return [USER_1, USER_2];
    }

    @Get(':id')
    @ApiResponse({})
    @AccessControlReadOne(resourceGetOne)
    getOwn() {
      return USER_1;
    }
  }

  let app: INestApplication;
  let reflector: Reflector;
  const createTestModule = async (rules: AccessControl, roles: string[]) => {
    class TestAccessService implements AccessControlServiceInterface {
      async getUser(_context: ExecutionContext): Promise<TestUser> {
        return new TestUser(1234);
      }
      async getUserRoles(
        _context: ExecutionContext,
      ): Promise<string | string[]> {
        return roles;
      }
    }
    const testService = new TestAccessService();
    const moduleConfig: AccessControlOptionsInterface = {
      settings: { rules: rules },
      service: testService,
    };
    reflector = new Reflector();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AccessControlModule.forRoot({
          service: testService,
          settings: {
            rules: rules,
          },
        }),
      ],
      controllers: [UserController],
      providers: [
        { provide: Reflector, useValue: reflector },
        {
          provide: ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
          useValue: moduleConfig.settings,
        },
        {
          provide: AccessControlService,
          useValue: testService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  };

  afterEach(async () => {
    await app.close();
  });

  it('should return filtered data combined', async () => {
    const rules = new AccessControl();
    rules.grant('role2').readAny(resourceGetAll, ['phone']);
    rules.grant('role1').readAny(resourceGetAll, ['firstName', 'lastName']);

    await createTestModule(rules, ['role1', 'role2']);
    await supertest(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect([
        {
          firstName: USER_1.firstName,
          lastName: USER_1.lastName,
          phone: USER_1.phone,
        },
        {
          firstName: USER_2.firstName,
          lastName: USER_2.lastName,
          phone: USER_2.phone,
        },
      ]);
  });

  it('should return filtered data based any possession as priority', async () => {
    const rules = new AccessControl();
    rules.grant('manager').readAny(resourceGetOne, ['firstName', 'lastName']);
    rules
      .grant('user')
      .readOwn(resourceGetOne, ['firstName', 'lastName', 'phone']);

    await createTestModule(rules, ['manager', 'user']);
    await supertest(app.getHttpServer()).get('/users/1').expect(200).expect({
      firstName: USER_1.firstName,
      lastName: USER_1.lastName,
    });
  });

  it('should return filtered data based on combine attributes', async () => {
    const rules = new AccessControl();
    rules.grant('manager').readOwn(resourceGetOne, ['firstName', 'lastName']);
    rules
      .grant('user')
      .readOwn(resourceGetOne, ['firstName', 'lastName', 'phone']);

    await createTestModule(rules, ['manager', 'user']);
    await supertest(app.getHttpServer()).get('/users/1').expect(200).expect({
      firstName: USER_1.firstName,
      lastName: USER_1.lastName,
      phone: USER_1.phone,
    });
  });

  it('should return filtered data based on one role', async () => {
    const rules = new AccessControl();
    rules.grant('role1').read(resourceGetOne, ['phone']);

    await createTestModule(rules, ['role1']);
    await supertest(app.getHttpServer()).get('/users/1').expect(200).expect({
      phone: USER_1.phone,
    });
  });

  it('should return filtered data based on one role as Any', async () => {
    const rules = new AccessControl();
    rules.grant('manager').readAny(resourceGetOne);

    await createTestModule(rules, ['manager']);
    await supertest(app.getHttpServer())
      .get('/users/1')
      .expect(200)
      .expect(USER_1);
  });

  it('should return filtered data based to show all attributes', async () => {
    const rules = new AccessControl();
    rules.grant('manager').readAny(resourceGetOne, ['*']);
    rules.grant('manager').readOwn(resourceGetOne, []);

    await createTestModule(rules, ['manager']);
    await supertest(app.getHttpServer())
      .get('/users/1')
      .expect(200)
      .expect(USER_1);
  });

  it('should return empty objects when no fields are allowed', async () => {
    const rules = new AccessControl();
    rules.grant('role1').readAny(resourceGetAll, []);

    await createTestModule(rules, ['role1']);
    await supertest(app.getHttpServer()).get('/users').expect(403);
  });

  it('should return empty objects when no fields are allowed', async () => {
    const rules = new AccessControl();
    rules.grant('role1').readAny(resourceGetAll, []);
    rules.grant('role1').readOwn(resourceGetAll, ['*', '!phone']);

    await createTestModule(rules, ['role1']);
    await supertest(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect([
        {
          firstName: USER_1.firstName,
          lastName: USER_1.lastName,
          dob: USER_1.dob,
        },
        {
          firstName: USER_2.firstName,
          lastName: USER_2.lastName,
          dob: USER_2.dob,
        },
      ]);
  });

  it('should all objects when second role has permission', async () => {
    const rules = new AccessControl();
    rules.grant('role1').readAny(resourceGetAll, []);
    rules.grant('role2').readOwn(resourceGetAll, ['*']);

    await createTestModule(rules, ['role1', 'role2']);
    await supertest(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect([USER_1, USER_2]);
  });

  it('should all objects when second role has permission', async () => {
    const rules = new AccessControl();
    rules.grant('role1').readAny(resourceGetOne, []);
    rules.grant('role2').readAny(resourceGetAll);

    await createTestModule(rules, ['role2']);
    await supertest(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect([USER_1, USER_2]);
  });
});
