import { Inject } from '@nestjs/common';

import { getDynamicRepositoryToken } from '../utils/get-dynamic-repository-token.js';

export const InjectDynamicRepository = (key: string) => {
  return Inject(getDynamicRepositoryToken(key));
};
