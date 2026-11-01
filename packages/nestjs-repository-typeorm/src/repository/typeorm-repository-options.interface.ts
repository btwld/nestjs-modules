import { type HookResolverService } from '@concepta/nestjs-core';
import { type TransactionScope } from '@concepta/nestjs-repository';

/**
 * Options for constructing a TypeOrmRepository.
 */
export interface TypeOrmRepositoryOptions {
  entityKey: string;
  transactionKey?: string;
  /** The name of the data source this repository writes through. */
  dataSourceName?: string;
  hookResolver?: HookResolverService;
  transactionScope?: TransactionScope;
}
