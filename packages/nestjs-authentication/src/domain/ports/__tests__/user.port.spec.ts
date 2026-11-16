import { mock } from 'vitest-mock-extended';

import { type PlainLiteralObject } from '@nestjs/common';
import { Command, type CommandBus, Query, type QueryBus } from '@nestjs/cqrs';

import { type ReferenceId } from '@concepta/nestjs-core';

import {
  type AuthenticationUserInterface,
  UserPort,
  type UserPortSettings,
  type AuthenticationUserResult,
  type GetUserByIdQueryInterface,
  type GetUserBySubjectQueryInterface,
  type GetUserByUsernameQueryInterface,
  type GetUserByEmailQueryInterface,
  type UpdateUserCommandInterface,
} from '../user.port.js';

class MockGetByIdQuery
  extends Query<AuthenticationUserResult>
  implements GetUserByIdQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly id: string,
  ) {
    super();
  }
}

class MockGetBySubjectQuery
  extends Query<AuthenticationUserResult>
  implements GetUserBySubjectQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly subject: string,
  ) {
    super();
  }
}

class MockGetByUsernameQuery
  extends Query<AuthenticationUserResult>
  implements GetUserByUsernameQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly username: string,
  ) {
    super();
  }
}

class MockGetByEmailQuery
  extends Query<AuthenticationUserResult>
  implements GetUserByEmailQueryInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly email: string,
  ) {
    super();
  }
}

class MockUpdateCommand
  extends Command<AuthenticationUserResult>
  implements UpdateUserCommandInterface
{
  constructor(
    public readonly ctx: PlainLiteralObject,
    public readonly id: ReferenceId,
    public readonly dto: Partial<AuthenticationUserInterface>,
  ) {
    super();
  }
}

describe(UserPort.name, () => {
  let port: UserPort;
  let queryBus: QueryBus;
  let commandBus: CommandBus;

  const portSettings: UserPortSettings = {
    getByIdQuery: MockGetByIdQuery,
    getBySubjectQuery: MockGetBySubjectQuery,
    getByUsernameQuery: MockGetByUsernameQuery,
    getByEmailQuery: MockGetByEmailQuery,
    updateCommand: MockUpdateCommand,
  };

  const mockUser: AuthenticationUserResult = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    active: true,
  };

  beforeEach(() => {
    queryBus = mock<QueryBus>();
    commandBus = mock<CommandBus>();
    port = new UserPort(portSettings, queryBus, commandBus);
  });

  describe('getById', () => {
    it('should dispatch GetByIdQuery via queryBus', async () => {
      void queryBus.execute;
      vi.spyOn(queryBus, 'execute').mockResolvedValue(mockUser);

      const result = await port.getById({}, 'user-1');

      expect(result).toEqual(mockUser);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(MockGetByIdQuery),
      );
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
      );
    });

    it('should return null when user not found', async () => {
      void queryBus.execute;
      vi.spyOn(queryBus, 'execute').mockResolvedValue(null);

      const result = await port.getById({}, 'unknown');

      expect(result).toBeNull();
    });
  });

  describe('getBySubject', () => {
    it('should dispatch GetBySubjectQuery via queryBus', async () => {
      void queryBus.execute;
      vi.spyOn(queryBus, 'execute').mockResolvedValue(mockUser);

      const result = await port.getBySubject({}, 'user-1');

      expect(result).toEqual(mockUser);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(MockGetBySubjectQuery),
      );
    });
  });

  describe('getByUsername', () => {
    it('should dispatch GetByUsernameQuery via queryBus', async () => {
      void queryBus.execute;
      vi.spyOn(queryBus, 'execute').mockResolvedValue(mockUser);

      const result = await port.getByUsername({}, 'testuser');

      expect(result).toEqual(mockUser);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(MockGetByUsernameQuery),
      );
    });
  });

  describe('getByEmail', () => {
    it('should dispatch GetByEmailQuery via queryBus', async () => {
      void queryBus.execute;
      vi.spyOn(queryBus, 'execute').mockResolvedValue(mockUser);

      const result = await port.getByEmail({}, 'test@example.com');

      expect(result).toEqual(mockUser);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(MockGetByEmailQuery),
      );
    });
  });
});
