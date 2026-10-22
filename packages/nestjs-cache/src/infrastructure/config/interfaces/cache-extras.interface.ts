import { type DynamicModule, type Provider } from '@nestjs/common';

import { type CacheRepositoryInterface } from '../../../domain/repositories/cache-repository.interface.js';
import { type CacheRepository } from '../../persistence/cache.repository.js';

/**
 * A repository class built once per `forFeature` key, around that key's
 * repository. Extend `CacheRepository` to write one.
 */
export type CacheRepositoryConstructor = new (
  ...args: ConstructorParameters<typeof CacheRepository>
) => CacheRepositoryInterface;

export interface CacheExtrasInterface extends Pick<DynamicModule, 'global'> {
  providers?: Provider[];
  repositories?: {
    cache?: CacheRepositoryConstructor;
  };
}
