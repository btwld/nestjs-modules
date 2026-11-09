import { mock } from 'vitest-mock-extended';

import {
  type ArgumentsHost,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AccessControlService } from '../access-control.service.js';

type HttpArgumentsHost = ReturnType<ArgumentsHost['switchToHttp']>;

describe('AccessControlDefaultService', () => {
  let service: AccessControlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccessControlService],
    }).compile();
    service = module.get<AccessControlService>(AccessControlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(AccessControlService);
  });

  it('getUser should return user', async () => {
    const argsHost = mock<HttpArgumentsHost>();
    argsHost.getRequest.mockReturnValue({ user: { id: 'abc123' } });

    const context = mock<ExecutionContext>();
    context.switchToHttp.mockReturnValue(argsHost);

    const user = await service.getUser(context);
    expect(user).toEqual({ id: 'abc123' });
  });

  it('getUserRoles should return roles', async () => {
    const argsHost = mock<HttpArgumentsHost>();
    argsHost.getRequest.mockReturnValue({
      user: {
        id: 'abc123',
        userRoles: [
          { role: { name: 'admin' } },
          { role: { name: 'readonly' } },
        ],
      },
    });

    const context = mock<ExecutionContext>();
    context.switchToHttp.mockReturnValue(argsHost);

    const userRoles = await service.getUserRoles(context);
    expect(userRoles).toEqual(['admin', 'readonly']);
  });

  it('getUserRoles should throw exception', async () => {
    const t = async () => {
      const argsHost = mock<HttpArgumentsHost>();
      argsHost.getRequest.mockReturnValue({});

      const context = mock<ExecutionContext>();
      context.switchToHttp.mockReturnValue(argsHost);

      await service.getUserRoles(context);
    };

    await expect(t()).rejects.toThrow(UnauthorizedException);
  });
});
