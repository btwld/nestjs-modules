import { type Provider } from '@nestjs/common';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { FILE_REPOSITORY_TOKEN } from '../../file.constants.js';
import { type FileRepositoryConstructor } from '../config/interfaces/file-extras.interface.js';
import { FileMapper } from '../persistence/file.mapper.js';
import { FileRepository } from '../persistence/file.repository.js';
import { type FileEntityInterface } from '../persistence/interfaces/file-entity.interface.js';

export function createFileRepositoryProvider(
  entityKey: string,
  customRepository?: FileRepositoryConstructor,
): Provider {
  return {
    provide: FILE_REPOSITORY_TOKEN,
    inject: [getDynamicRepositoryToken(entityKey), FileMapper],
    useFactory: (
      repository: RepositoryInterface<FileEntityInterface>,
      mapper: FileMapper,
    ) => {
      const RepoClass = customRepository ?? FileRepository;
      return new RepoClass(repository, mapper);
    },
  };
}
