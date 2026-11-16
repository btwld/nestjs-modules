import { getDynamicRepositoryToken } from '../get-dynamic-repository-token.js';

describe(getDynamicRepositoryToken, () => {
  it('derives the injection token from the registration key', () => {
    expect(getDynamicRepositoryToken('orders')).toBe(
      'DYNAMIC_REPOSITORY_TOKEN_orders',
    );
  });
});
