import { type DynamicModule, Module, type Type } from '@nestjs/common';

import { HookResolverService } from '@concepta/nestjs-core';

import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';

import {
  MemoryRepositoryFixture,
  type MemoryRepositoryOptionsFixture,
} from './memory-repository.fixture.js';
import {
  ORDER_LINE_METADATA,
  ORDER_METADATA,
  OrderEntityFixture,
  OrderLineEntityFixture,
} from './order.fixture.js';
import {
  NOTE_METADATA,
  NoteEntityFixture,
  PET_METADATA,
  PetEntityFixture,
} from './pet-note.fixture.js';

const ADAPTERS = new Map<
  Type,
  (key: string, options: MemoryRepositoryOptionsFixture) => object
>([
  [
    OrderEntityFixture,
    (key, options) => new MemoryRepositoryFixture(key, ORDER_METADATA, options),
  ],
  [
    OrderLineEntityFixture,
    (key, options) =>
      new MemoryRepositoryFixture(key, ORDER_LINE_METADATA, options),
  ],
  [
    PetEntityFixture,
    (key, options) => new MemoryRepositoryFixture(key, PET_METADATA, options),
  ],
  [
    NoteEntityFixture,
    (key, options) => new MemoryRepositoryFixture(key, NOTE_METADATA, options),
  ],
]);

/**
 * A driver over `MemoryRepositoryFixture`, for registering through
 * `RepositoryModule.forRoot()`. Like a real driver, it hands each adapter the
 * optional hook resolver, and binds nothing itself.
 */
@Module({})
export class MemoryRepositoryModuleFixture {
  static register(entities: RepositoryProviderOptions[]): DynamicModule {
    return {
      module: MemoryRepositoryModuleFixture,
      providers: entities.map(({ key, entity }) => ({
        provide: getDynamicRepositoryToken(key),
        inject: [{ token: HookResolverService, optional: true }],
        useFactory: (hookResolver?: HookResolverService) => {
          const create = ADAPTERS.get(entity);
          if (!create) {
            throw new Error(`No memory adapter for ${entity.name}`);
          }
          return create(key, { hookResolver });
        },
      })),
    };
  }
}
