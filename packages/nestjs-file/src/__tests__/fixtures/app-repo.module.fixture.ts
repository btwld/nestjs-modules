import { type DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreModule } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { type FileStorageServiceInterface } from '../../domain/interfaces/file-storage-service.interface.js';
import { type FileUploadPolicyInterface } from '../../domain/interfaces/file-upload-policy.interface.js';
import { FileModule } from '../../file.module.js';

import { FileEntityFixture } from './entities/file.entity.fixture.js';
import { ormConfig } from './ormconfig.fixture.js';

const FILE_ENTITY_KEY = 'file';

@Module({})
export class AppRepoModuleFixture {
  static register(
    storage: FileStorageServiceInterface,
    uploadPolicy?: FileUploadPolicyInterface,
  ): DynamicModule {
    return {
      module: AppRepoModuleFixture,
      imports: [
        CoreModule.forRoot(),
        TypeOrmModule.forRoot(ormConfig),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmSqliteRepositoryModule,
              entities: [{ key: FILE_ENTITY_KEY, entity: FileEntityFixture }],
            },
          ],
        }),
        FileModule.forRoot({
          storageServices: [storage],
          uploadPolicy,
          entities: { file: FILE_ENTITY_KEY },
        }),
      ],
    };
  }
}
