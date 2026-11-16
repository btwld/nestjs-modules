import { z } from 'zod';

import { LocalStrategyPolicy } from '../local-strategy.policy.js';

const mockLoginSchema = z.object({});

describe(LocalStrategyPolicy.name, () => {
  it('should create with default values', () => {
    const policy = new LocalStrategyPolicy({});

    expect(policy.loginSchema).toBeUndefined();
    expect(policy.usernameField).toBe('username');
    expect(policy.passwordField).toBe('password');
  });

  it('should create with provided settings', () => {
    const policy = new LocalStrategyPolicy({
      loginSchema: mockLoginSchema,
      usernameField: 'email',
      passwordField: 'passcode',
    });

    expect(policy.loginSchema).toBe(mockLoginSchema);
    expect(policy.usernameField).toBe('email');
    expect(policy.passwordField).toBe('passcode');
  });

  it('should use defaults when optional fields omitted', () => {
    const policy = new LocalStrategyPolicy({
      loginSchema: mockLoginSchema,
    });

    expect(policy.loginSchema).toBe(mockLoginSchema);
    expect(policy.usernameField).toBe('username');
    expect(policy.passwordField).toBe('password');
  });
});
