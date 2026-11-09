import { CrudCreateCommand } from '@concepta/nestjs-crud';

import { type CacheCreatableInterface } from '../../../../domain/interfaces/cache-creatable.interface.js';
import { type CacheInterface } from '../../../../domain/interfaces/cache.interface.js';

export class CreateCacheRequest extends CrudCreateCommand<
  CacheInterface,
  CacheCreatableInterface
> {}
