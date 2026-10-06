import { type CacheRepositoryInterface } from './cache-repository.interface.js';

export interface CacheRepositoryResolverInterface {
  resolve(entityKey: string): CacheRepositoryInterface;
}
