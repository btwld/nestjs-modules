import { CrudUpdateCommand } from '@concepta/nestjs-crud';

import { type CacheUpdatableInterface } from '../../../../domain/interfaces/cache-updatable.interface.js';
import { type CacheInterface } from '../../../../domain/interfaces/cache.interface.js';

export class UpdateCacheRequest extends CrudUpdateCommand<
  CacheInterface,
  CacheUpdatableInterface
> {}
