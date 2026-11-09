import { ValidatePasswordHistoryCommand } from '../../impl/validate-password-history.command.js';
import { ValidatePasswordHistoryHandler } from '../validate-password-history.handler.js';

import { createMockCreationService } from './mock.helpers.js';

describe(ValidatePasswordHistoryHandler.name, () => {
  it('should delegate to PasswordCreationService.validateHistory', async () => {
    const creationService = createMockCreationService();
    const handler = new ValidatePasswordHistoryHandler(creationService);
    creationService.validateHistory.mockResolvedValue(true);

    const targets = [{ passwordHash: 'h1' }, { passwordHash: 'h2' }];
    const command = new ValidatePasswordHistoryCommand('plain', targets);
    const output = await handler.execute(command);

    expect(creationService.validateHistory).toHaveBeenCalledWith({
      password: 'plain',
      targets,
    });
    expect(output).toEqual(true);
  });
});
