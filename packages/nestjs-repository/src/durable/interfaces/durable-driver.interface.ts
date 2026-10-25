import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryInterface } from '../../repository/interfaces/repository.interface.js';

import { type DurableBindingInterface } from './durable-binding.interface.js';

/**
 * A repository driver's support for durable messaging.
 *
 * `DurableMessagingModule` hands it the repository registered under the
 * configured key; the driver returns a store on that repository's
 * datasource and the key of the transaction its writes use. A driver that
 * cannot — the repository is not its own, has no transactions, or runs on a
 * database the store does not support — throws
 * `UnsupportedDurableDriverException`.
 */
export interface DurableDriverInterface {
  bind(
    repository: RepositoryInterface<PlainLiteralObject>,
  ): DurableBindingInterface;
}
