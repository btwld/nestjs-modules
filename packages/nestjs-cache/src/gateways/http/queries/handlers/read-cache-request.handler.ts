import { CrudReadHandler } from '@concepta/nestjs-crud';

import { type CacheInterface } from '../../../../domain/interfaces/cache.interface.js';

export class ReadCacheRequestHandler extends CrudReadHandler<CacheInterface> {}
