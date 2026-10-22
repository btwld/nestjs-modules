import { Possession } from 'accesscontrol/lib/enums/index.js';

import { PossessionEnum } from '../possession.enum.js';

describe('Access control possession enumeration', () => {
  it('should match specification', () => {
    expect(PossessionEnum).toEqual({
      ANY: Possession.ANY,
      OWN: Possession.OWN,
    });
  });
});
