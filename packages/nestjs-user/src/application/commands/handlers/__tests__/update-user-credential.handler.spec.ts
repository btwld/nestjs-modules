import { AppContextHost } from '@concepta/nestjs-core';

import {
  createMockTxScope,
  createMockUserCredentialsService,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { UpdateUserCredentialCommand } from '../../impl/update-user-credential.command.js';
import { UpdateUserCredentialHandler } from '../update-user-credential.handler.js';

describe(UpdateUserCredentialHandler.name, () => {
  const userCredentialsService = createMockUserCredentialsService();
  const txScope = createMockTxScope();

  let handler: UpdateUserCredentialHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new UpdateUserCredentialHandler(userCredentialsService, txScope);
  });

  it('should delegate to userCredentialsService.updatePassword', async () => {
    const passwordDto = { password: 'new-pass', passwordCurrent: 'old-pass' };

    await handler.execute(
      new UpdateUserCredentialCommand({}, 'user-1', passwordDto),
    );

    expect(userCredentialsService.updatePassword).toHaveBeenCalledTimes(1);
    const [ctx, , userId, password, passwordCurrent] =
      userCredentialsService.updatePassword.mock.calls[0];
    expect(ctx).toBeInstanceOf(AppContextHost);
    expect(userId).toBe('user-1');
    expect(password).toBe('new-pass');
    expect(passwordCurrent).toBe('old-pass');
  });

  it('should work without passwordCurrent', async () => {
    const passwordDto = { password: 'new-pass' };

    await handler.execute(
      new UpdateUserCredentialCommand({}, 'user-1', passwordDto),
    );

    expect(userCredentialsService.updatePassword).toHaveBeenCalledTimes(1);
    const [ctx, , userId, password, passwordCurrent] =
      userCredentialsService.updatePassword.mock.calls[0];
    expect(ctx).toBeInstanceOf(AppContextHost);
    expect(userId).toBe('user-1');
    expect(password).toBe('new-pass');
    expect(passwordCurrent).toBeUndefined();
  });
});
