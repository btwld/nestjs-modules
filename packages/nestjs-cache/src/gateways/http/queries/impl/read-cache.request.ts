import { CrudReadQuery } from '@concepta/nestjs-crud';

import { type CacheInterface } from '../../../../domain/interfaces/cache.interface.js';

export class ReadCacheRequest extends CrudReadQuery<CacheInterface> {}
