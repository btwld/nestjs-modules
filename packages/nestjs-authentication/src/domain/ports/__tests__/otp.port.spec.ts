import { type PlainLiteralObject } from '@nestjs/common';
import { Command, CommandBus, Query, QueryBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';

import { type AssigneeRelationInterface } from '@concepta/nestjs-core';

import {
  OtpPort,
  type OtpPortSettings,
  type OtpCreateOptions,
  type AuthenticationOtpCreatableInterface,
  type AuthenticationOtpInterface,
  type CreateOtpCommandInterface,
  type ValidateOtpQueryInterface,
  type ClearOtpCommandInterface,
} from '../otp.port.js';

class MockCreateOtpCommand
  extends Command<AuthenticationOtpInterface>
  implements CreateOtpCommandInterface
{
  duplicateStrategy?: 'ALLOW' | 'DEACTIVATE';
  rateSeconds?: number;
  rateThreshold?: number;

  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly otp: AuthenticationOtpCreatableInterface,
    options?: OtpCreateOptions,
  ) {
    super();
    this.duplicateStrategy = options?.duplicateStrategy;
    this.rateSeconds = options?.rateSeconds;
    this.rateThreshold = options?.rateThreshold;
  }
}

class MockValidateOtpQuery
  extends Query<AssigneeRelationInterface | null>
  implements ValidateOtpQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly otp: Pick<
      AuthenticationOtpInterface,
      'category' | 'passcode'
    >,
  ) {
    super();
  }
}

class MockClearOtpCommand
  extends Command<void>
  implements ClearOtpCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly namespace: string,
    public readonly otp: Pick<
      AuthenticationOtpInterface,
      'category' | 'assigneeId'
    >,
  ) {
    super();
  }
}

describe(OtpPort.name, () => {
  let port: OtpPort;
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  const portSettings: OtpPortSettings = {
    createCommand: MockCreateOtpCommand,
    validateQuery: MockValidateOtpQuery,
    clearCommand: MockClearOtpCommand,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CommandBus,
          useValue: { execute: vi.fn() },
        },
        {
          provide: QueryBus,
          useValue: { execute: vi.fn() },
        },
      ],
    }).compile();

    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
    port = new OtpPort(portSettings, commandBus, queryBus);
  });

  describe('create', () => {
    it('should dispatch CreateOtpCommand via commandBus', async () => {
      const mockOtp = {
        category: 'test',
        type: 'uuid',
        passcode: '123456',
        expirationDate: new Date(),
        active: true,
        assigneeId: 'user-1',
      };
      vi.spyOn(commandBus, 'execute').mockResolvedValue(mockOtp);

      const otp: AuthenticationOtpCreatableInterface = {
        category: 'test',
        type: 'uuid',
        assigneeId: 'user-1',
        expiresIn: '24h',
      };

      const result = await port.create({}, 'userOtp', otp, {
        duplicateStrategy: 'DEACTIVATE',
      });

      expect(result).toEqual(mockOtp);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(MockCreateOtpCommand),
      );
    });
  });

  describe('validate', () => {
    it('should dispatch ValidateOtpQuery via queryBus', async () => {
      const mockAssignee = { assigneeId: 'user-1' };
      vi.spyOn(queryBus, 'execute').mockResolvedValue(mockAssignee);

      const result = await port.validate({}, 'userOtp', {
        category: 'test',
        passcode: '123456',
      });

      expect(result).toEqual(mockAssignee);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(MockValidateOtpQuery),
      );
    });

    it('should return null when OTP not found', async () => {
      vi.spyOn(queryBus, 'execute').mockResolvedValue(null);

      const result = await port.validate({}, 'userOtp', {
        category: 'test',
        passcode: 'invalid',
      });

      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('should dispatch ClearOtpCommand via commandBus', async () => {
      vi.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

      await port.clear({}, 'userOtp', {
        category: 'test',
        assigneeId: 'user-1',
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(MockClearOtpCommand),
      );
    });
  });
});
