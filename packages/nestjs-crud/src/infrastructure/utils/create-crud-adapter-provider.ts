import {
  type PlainLiteralObject,
  type Provider,
  type Type,
} from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type CrudAdapter } from '../adapters/crud.adapter.js';

import { getDynamicAdapterToken } from './crud-infra.utils.js';

/**
 * Configuration for creating a CRUD adapter provider
 */
interface CreateCrudAdapterProviderConfig<Entity extends PlainLiteralObject> {
  /**
   * Entity key used for repository injection tokens.
   */
  entity: string;

  /**
   * The CRUD adapter class to instantiate.
   */
  adapter: Type<CrudAdapter<Entity>>;
}

/**
 * Creates a NestJS provider for a CRUD adapter.
 *
 * This factory eliminates boilerplate adapter class files by dynamically
 * creating adapter instances from repositories.
 *
 * A unique token is derived from the entity key (e.g., 'CRUD_ADAPTER_USER').
 * Repository token is derived from entity via getDynamicRepositoryToken.
 *
 * @example
 * ```typescript
 * const UserCrudAdapterProvider = createCrudAdapterProvider({
 *   entity: 'User',
 *   adapter: CrudAdapter,
 * });
 *
 * @Module({
 *   providers: [UserCrudAdapterProvider],
 * })
 * export class UserModule {}
 * ```
 *
 * @param config - Configuration for the CRUD adapter provider
 * @returns A NestJS provider that creates the adapter instance
 */
export function createCrudAdapterProvider<Entity extends PlainLiteralObject>(
  config: CreateCrudAdapterProviderConfig<Entity>,
): Provider<CrudAdapter<Entity>> {
  const { entity, adapter } = config;
  const token = getDynamicAdapterToken(entity);

  return {
    provide: token,
    inject: [getDynamicRepositoryToken(entity)],
    useFactory: (repository: RepositoryInterface<Entity>) => {
      return new adapter(repository);
    },
  };
}
