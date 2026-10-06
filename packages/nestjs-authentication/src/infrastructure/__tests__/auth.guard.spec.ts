import { mock } from 'vitest-mock-extended';

import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

import { GuardsPolicy } from '../../domain/policies/guards.policy.js';
import { AuthGuard } from '../auth.guard.js';

vi.mock('@nestjs/passport', () => ({
  AuthGuard: vi.fn().mockImplementation(() => vi.fn()),
}));

describe(AuthGuard.name, () => {
  let reflector: Reflector;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    mockContext = mock<ExecutionContext>();
  });

  it('should use PassportAuthGuard for Express', () => {
    AuthGuard('local');
    expect(PassportAuthGuard).toHaveBeenCalledWith('local');
  });

  it('should always activate if guards are disabled globally', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const Guard = AuthGuard('local', { canDisable: true });
    const guardInstance = new Guard(
      new GuardsPolicy({ enable: false }),
      reflector,
    );
    expect(guardInstance.canActivate(mockContext)).toBeTruthy();
  });

  it('should respect disable callback', () => {
    const Guard = AuthGuard('local', { canDisable: true });
    const guardInstance = new Guard(
      new GuardsPolicy({ enable: false }),
      reflector,
    );
    expect(guardInstance.canActivate(mockContext)).toBeTruthy();
  });

  it('should respect enable guard and disabled from reflector callback', () => {
    vi.spyOn(reflector, 'get')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(undefined);
    const Guard = AuthGuard('local', { canDisable: true });
    const guardInstance = new Guard(
      new GuardsPolicy({ enable: true }),
      reflector,
    );
    expect(guardInstance.canActivate(mockContext)).toBeTruthy();
  });

  it('should respect guards.disable callback', () => {
    vi.spyOn(reflector, 'get').mockReturnValue(undefined);
    const Guard = AuthGuard('local', { canDisable: true });
    const guardInstance = new Guard(
      new GuardsPolicy({ enable: true, disable: () => true }),
      reflector,
    );
    expect(guardInstance.canActivate(mockContext)).toBeTruthy();
  });
});
