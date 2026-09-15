import { z } from 'zod';

import { uuidGeneratorUtil } from '../uuid-generator.util.js';

describe(uuidGeneratorUtil.name, () => {
  it('should return a valid UUID', () => {
    const result = uuidGeneratorUtil();

    expect(z.uuid({ version: 'v4' }).safeParse(result).success).toBe(true);
  });

  it('should return a unique value on each call', () => {
    const a = uuidGeneratorUtil();
    const b = uuidGeneratorUtil();

    expect(a).not.toBe(b);
  });
});
