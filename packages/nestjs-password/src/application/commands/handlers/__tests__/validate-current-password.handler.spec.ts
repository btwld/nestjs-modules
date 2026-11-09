import { ValidateCurrentPasswordCommand } from '../../impl/validate-current-password.command.js';
import { ValidateCurrentPasswordHandler } from '../validate-current-password.handler.js';

import { createMockCreationService } from './mock.helpers.js';

describe(ValidateCurrentPasswordHandler.name, () => {
  it('should delegate to PasswordCreationService.validateCurrent', async () => {
    const creationService = createMockCreationService();
    const handler = new ValidateCurrentPasswordHandler(creationService);
    creationService.validateCurrent.mockResolvedValue(true);

    const target = { passwordHash: 'hash' };
    const command = new ValidateCurrentPasswordCommand('plain', target);
    const output = await handler.execute(command);

    expect(creationService.validateCurrent).toHaveBeenCalledWith({
      password: 'plain',
      target,
    });
    expect(output).toEqual(true);
  });
});
