import { randomUUID } from 'crypto';

import { type MockProxy, mock } from 'vitest-mock-extended';

import { type CommandBus } from '@nestjs/cqrs';

import { IssueAuthenticatedResponseCommand } from '../../../../application/commands/impl/issue-authenticated-response.command.js';
import { type AuthenticatedResponseInterface } from '../../../../domain/interfaces/authenticated-response.interface.js';
import { type AuthenticatedUserInterface } from '../../../../domain/interfaces/authenticated-user.interface.js';

import { LocalControllerFixture } from './fixtures/local.controller.fixture.js';

describe(LocalControllerFixture, () => {
  const accessToken = 'accessToken';
  const refreshToken = 'refreshToken';
  let controller: LocalControllerFixture;
  let commandBus: MockProxy<CommandBus>;
  const response: AuthenticatedResponseInterface = {
    accessToken,
    refreshToken,
  };

  beforeEach(async () => {
    commandBus = mock<CommandBus>();
    void commandBus.execute;
    vi.spyOn(commandBus, 'execute').mockResolvedValue(response);
    controller = new LocalControllerFixture(commandBus);
  });

  describe(LocalControllerFixture.prototype.login, () => {
    it('should return user', async () => {
      const user: AuthenticatedUserInterface = {
        id: randomUUID(),
      };
      const result = await controller.login(user);
      expect(result.accessToken).toBe(response.accessToken);
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(IssueAuthenticatedResponseCommand),
      );
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ id: user.id }),
      );
    });
  });
});
