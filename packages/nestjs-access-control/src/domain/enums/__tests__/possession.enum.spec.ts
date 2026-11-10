import { PossessionEnum } from '../possession.enum.js';

describe('Access control possession enumeration', () => {
  it('names the possessions that end a grant action', () => {
    expect(PossessionEnum).toEqual({ ANY: 'any', OWN: 'own' });
  });
});
