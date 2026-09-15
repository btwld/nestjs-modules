import { ExtractJwt } from 'passport-jwt';

import { RefreshStrategyPolicy } from '../refresh-strategy.policy.js';

describe(RefreshStrategyPolicy.name, () => {
  it('should default jwtFromRequest to undefined', () => {
    const policy = new RefreshStrategyPolicy({});

    expect(policy.jwtFromRequest).toBeUndefined();
  });

  it('should apply provided jwtFromRequest', () => {
    const extractor = ExtractJwt.fromBodyField('refreshToken');
    const policy = new RefreshStrategyPolicy({ jwtFromRequest: extractor });

    expect(policy.jwtFromRequest).toBe(extractor);
  });
});
