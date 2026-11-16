import { mockDeep } from 'vitest-mock-extended';

import { type FactoryProvider } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { FILE_REPOSITORY_TOKEN } from '../../../file.constants.js';
import { FileMapper } from '../../persistence/file.mapper.js';
import { FileRepository } from '../../persistence/file.repository.js';
import { type FileEntityInterface } from '../../persistence/interfaces/file-entity.interface.js';
import { createFileRepositoryProvider } from '../create-file-repository-provider.js';

class OwnFileRepository extends FileRepository {
  get deps() {
    return [this.repository, this.mapper];
  }
}

function isFactoryProvider(provider: unknown): provider is FactoryProvider {
  return (
    typeof provider === 'object' &&
    provider !== null &&
    'useFactory' in provider
  );
}

describe(createFileRepositoryProvider.name, () => {
  const repository = mockDeep<RepositoryInterface<FileEntityInterface>>();
  const mapper = new FileMapper();

  it('provides the repository token from the entity key and the mapper', () => {
    const provider = createFileRepositoryProvider('file');

    expect(provider).toEqual(
      expect.objectContaining({
        provide: FILE_REPOSITORY_TOKEN,
        inject: [getDynamicRepositoryToken('file'), FileMapper],
      }),
    );
  });

  it('builds a FileRepository by default', () => {
    const provider = createFileRepositoryProvider('file');
    if (!isFactoryProvider(provider)) throw new Error('not a factory');

    expect(provider.useFactory(repository, mapper)).toBeInstanceOf(
      FileRepository,
    );
  });

  it('builds the custom class around the same repository and mapper', () => {
    const provider = createFileRepositoryProvider('file', OwnFileRepository);
    if (!isFactoryProvider(provider)) throw new Error('not a factory');

    const built = provider.useFactory(repository, mapper);

    expect(built).toBeInstanceOf(OwnFileRepository);
    expect(built.deps).toEqual([repository, mapper]);
  });
});
