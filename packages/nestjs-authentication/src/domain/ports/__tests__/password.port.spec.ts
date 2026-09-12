import { type PlainLiteralObject } from '@nestjs/common';
import { Command, CommandBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  type ReferenceId,
  type ReferenceIdInterface,
} from '@concepta/nestjs-core';

import {
  PasswordPort,
  type PasswordPortSettings,
  type SetPasswordCommandInterface,
  type ValidatePasswordCommandInterface,
} from '../password.port.js';

class MockValidatePasswordCommand
  extends Command<boolean>
  implements ValidatePasswordCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly password: string,
    public readonly target: ReferenceIdInterface,
  ) {
    super();
  }
}

class MockSetPasswordCommand
  extends Command<void>
  implements SetPasswordCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly password: string,
    public readonly assigneeId: ReferenceId,
  ) {
    super();
  }
}

describe(PasswordPort.name, () => {
  let port: PasswordPort;
  let commandBus: CommandBus;

  const portSettings: PasswordPortSettings = {
    validateCommand: MockValidatePasswordCommand,
    setPasswordCommand: MockSetPasswordCommand,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: CommandBus, useValue: { execute: vi.fn() } }],
    }).compile();

    commandBus = module.get(CommandBus);
    port = new PasswordPort(portSettings, commandBus);
  });

  describe('validate', () => {
    it('should dispatch ValidatePasswordCommand via commandBus', async () => {
      const target: ReferenceIdInterface = { id: 'user-1' };
      vi.spyOn(commandBus, 'execute').mockResolvedValue(true);

      const result = await port.validate({}, 'my-password', target);

      expect(result).toBe(true);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(MockValidatePasswordCommand),
      );
    });

    it('should forward password and target to command', async () => {
      const target: ReferenceIdInterface = { id: 'user-1' };
      vi.spyOn(commandBus, 'execute').mockResolvedValue(false);

      await port.validate({}, 'secret', target);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'secret', target }),
      );
    });
  });

  describe('setPassword', () => {
    it('should dispatch SetPasswordCommand via commandBus', async () => {
      vi.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

      await port.setPassword({}, 'new-password', 'user-1');

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(MockSetPasswordCommand),
      );
    });

    it('should forward password and assigneeId to command', async () => {
      vi.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

      await port.setPassword({}, 'new-pass', 'user-42');

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'new-pass',
          assigneeId: 'user-42',
        }),
      );
    });
  });
});
