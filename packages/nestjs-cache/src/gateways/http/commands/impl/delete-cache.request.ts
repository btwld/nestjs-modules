import { CrudDeleteCommand } from '@concepta/nestjs-crud';

import { type CacheInterface } from '../../../../domain/interfaces/cache.interface.js';

export class DeleteCacheRequest extends CrudDeleteCommand<CacheInterface> {}
