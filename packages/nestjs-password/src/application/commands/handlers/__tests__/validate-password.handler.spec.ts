import { ValidatePasswordCommand } from '../../impl/validate-password.command.js';
import { ValidatePasswordHandler } from '../validate-password.handler.js';

import { createMockValidationService } from './mock.helpers.js';

describe(ValidatePasswordHandler.name, () => {
  it('should delegate to PasswordValidationService.validate', async () => {
    const validationService = createMockValidationService();
    const handler = new ValidatePasswordHandler(validationService);
    validationService.validate.mockResolvedValue(true);

    const options = { password: 'plain', passwordHash: 'hash' };
    const command = new ValidatePasswordCommand(options);
    const output = await handler.execute(command);

    expect(validationService.validate).toHaveBeenCalledWith(options);
    expect(output).toEqual(true);
  });
});
