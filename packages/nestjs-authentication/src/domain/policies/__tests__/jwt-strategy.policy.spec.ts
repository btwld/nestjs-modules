import { ExtractJwt } from 'passport-jwt';

import { JwtStrategyPolicy } from '../jwt-strategy.policy.js';

describe(JwtStrategyPolicy.name, () => {
  it('should default requireUserValidation to false', () => {
    const policy = new JwtStrategyPolicy({});

    expect(policy.jwtFromRequest).toBeUndefined();
    expect(policy.requireUserValidation).toBe(false);
  });

  it('should apply provided jwtFromRequest', () => {
    const extractor = ExtractJwt.fromAuthHeaderAsBearerToken();
    const policy = new JwtStrategyPolicy({ jwtFromRequest: extractor });

    expect(policy.jwtFromRequest).toBe(extractor);
  });

  it('should apply provided requireUserValidation', () => {
    const policy = new JwtStrategyPolicy({ requireUserValidation: true });

    expect(policy.requireUserValidation).toBe(true);
  });

  it('should create with all settings', () => {
    const extractor = ExtractJwt.fromBodyField('token');
    const policy = new JwtStrategyPolicy({
      jwtFromRequest: extractor,
      requireUserValidation: true,
    });

    expect(policy.jwtFromRequest).toBe(extractor);
    expect(policy.requireUserValidation).toBe(true);
  });
});
