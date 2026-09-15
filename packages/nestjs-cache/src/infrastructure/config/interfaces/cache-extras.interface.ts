import { type DynamicModule, type Provider, type Type } from '@nestjs/common';

import { type CacheRepositoryInterface } from '../../../domain/repositories/cache-repository.interface.js';

export interface CacheExtrasInterface extends Pick<DynamicModule, 'global'> {
  providers?: Provider[];
  repositories?: {
    cache?: Type<CacheRepositoryInterface>;
  };
}
