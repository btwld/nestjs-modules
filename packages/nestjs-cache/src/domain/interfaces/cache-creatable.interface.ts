import { type CacheInterface } from './cache.interface.js';

export interface CacheCreatableInterface extends Pick<
  CacheInterface,
  'key' | 'type' | 'assigneeId'
> {
  data?: string | null;
  expiresIn?: string | null;
}
