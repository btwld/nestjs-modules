import { type PasswordUpdateInterface } from '@concepta/nestjs-password';

import { type UserCreatableInterface } from '../../../../domain/interfaces/user-creatable.interface.js';
import { type UserUpdatableInterface } from '../../../../domain/interfaces/user-updatable.interface.js';
import { CreateUserCredentialCommand } from '../create-user-credential.command.js';
import { CreateUserCommand } from '../create-user.command.js';
import { RemoveUserCommand } from '../remove-user.command.js';
import { SetUserPasswordCommand } from '../set-user-password.command.js';
import { UpdateUserCredentialCommand } from '../update-user-credential.command.js';
import { UpdateUserPasswordCommand } from '../update-user-password.command.js';
import { UpdateUserCommand } from '../update-user.command.js';

describe(CreateUserCommand.name, () => {
  it('should store ctx and dto', () => {
    const dto: UserCreatableInterface = {
      email: 'a@b.com',
      username: 'john',
    };
    const cmd = new CreateUserCommand({}, dto);
    expect(cmd.dto).toBe(dto);
  });
});

describe(UpdateUserCommand.name, () => {
  it('should store ctx, id, and dto', () => {
    const dto: Partial<UserUpdatableInterface> = { active: false };
    const cmd = new UpdateUserCommand({}, 'user-1', dto);
    expect(cmd.id).toBe('user-1');
    expect(cmd.dto).toBe(dto);
  });
});

describe(RemoveUserCommand.name, () => {
  it('should store ctx and id', () => {
    const cmd = new RemoveUserCommand({}, 'user-1');
    expect(cmd.id).toBe('user-1');
  });
});

describe(SetUserPasswordCommand.name, () => {
  it('should store ctx, userId, and password', () => {
    const cmd = new SetUserPasswordCommand({}, 'user-1', 'pass123');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.password).toBe('pass123');
  });
});

describe(CreateUserCredentialCommand.name, () => {
  it('should store ctx, userId, and password', () => {
    const cmd = new CreateUserCredentialCommand({}, 'user-1', 'pass123');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.password).toBe('pass123');
  });

  it('should store an already-hashed password storage object', () => {
    const passwordStorage = { passwordHash: 'hashed' };
    const cmd = new CreateUserCredentialCommand({}, 'user-1', passwordStorage);
    expect(cmd.password).toBe(passwordStorage);
  });
});

describe(UpdateUserPasswordCommand.name, () => {
  it('should store ctx, userId, and passwordDto', () => {
    const passwordDto: PasswordUpdateInterface = {
      password: 'new-pass',
      passwordCurrent: 'old-pass',
    };
    const cmd = new UpdateUserPasswordCommand({}, 'user-1', passwordDto);
    expect(cmd.userId).toBe('user-1');
    expect(cmd.passwordDto).toBe(passwordDto);
  });
});

describe(UpdateUserCredentialCommand.name, () => {
  it('should store ctx, userId, and passwordDto', () => {
    const passwordDto: PasswordUpdateInterface = {
      password: 'new-pass',
    };
    const cmd = new UpdateUserCredentialCommand({}, 'user-1', passwordDto);
    expect(cmd.userId).toBe('user-1');
    expect(cmd.passwordDto).toBe(passwordDto);
  });
});
