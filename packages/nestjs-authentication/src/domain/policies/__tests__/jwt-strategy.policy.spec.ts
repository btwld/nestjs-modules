import { ExtractJwt } from 'passport-jwt';

import { JwtStrategyPolicy } from '../jwt-strategy.policy.js';

describe(JwtStrategyPolicy.name, () => {
  it('should leave jwtFromRequest undefined when not provided', () => {
    const policy = new JwtStrategyPolicy({});

    expect(policy.jwtFromRequest).toBeUndefined();
  });

  it('should apply provided jwtFromRequest', () => {
    const extractor = ExtractJwt.fromAuthHeaderAsBearerToken();
    const policy = new JwtStrategyPolicy({ jwtFromRequest: extractor });

    expect(policy.jwtFromRequest).toBe(extractor);
  });
});
