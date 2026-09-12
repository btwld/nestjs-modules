import { Strategy } from 'passport-strategy';

import { PassportStrategy } from '@nestjs/passport';

import { PassportStrategyFactory } from '../passport-strategy.factory.js';

vi.mock('@nestjs/passport', () => ({
  PassportStrategy: vi.fn().mockImplementation((strategy, name) => ({
    strategy,
    name,
  })),
}));

describe(PassportStrategyFactory.name, () => {
  class MockStrategy extends Strategy {
    authenticate() {}
  }

  it('should return a strategy configured for Express', () => {
    const strategyName = 'mockStrategy';
    const strategy = PassportStrategyFactory(MockStrategy, strategyName);
    expect(strategy).toBeDefined();
    expect(strategy.name).toEqual(strategyName);
    expect(PassportStrategy).toHaveBeenCalledWith(MockStrategy, strategyName);
  });

  it('should handle different strategy types and names correctly', () => {
    const anotherStrategyName = 'anotherMockStrategy';
    const anotherStrategy = PassportStrategyFactory(
      MockStrategy,
      anotherStrategyName,
    );
    expect(anotherStrategy.name).toEqual(anotherStrategyName);
    expect(PassportStrategy).toHaveBeenCalledWith(
      MockStrategy,
      anotherStrategyName,
    );
  });
});
