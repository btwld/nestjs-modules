import { type DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreModule } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { type FileScanServiceInterface } from '../../domain/interfaces/file-scan-service.interface.js';
import { type FileScannedStorageServiceInterface } from '../../domain/interfaces/file-scanned-storage-service.interface.js';
import { type FileStorageServiceInterface } from '../../domain/interfaces/file-storage-service.interface.js';
import { FileModule } from '../../file.module.js';
import { type FileUnscannedOptionsInterface } from '../../infrastructure/config/interfaces/file-unscanned-options.interface.js';

import { FileEntityFixture } from './entities/file.entity.fixture.js';
import { ormConfig } from './ormconfig.fixture.js';

const FILE_ENTITY_KEY = 'file';

@Module({})
export class AppRepoModuleFixture {
  static register(
    storage: FileStorageServiceInterface,
    uploadPolicy?: FileUnscannedOptionsInterface['uploadPolicy'],
  ): DynamicModule {
    return AppRepoModuleFixture.withFileModule(
      FileModule.forRoot({
        storageServices: [storage],
        uploadPolicy,
        entities: { file: FILE_ENTITY_KEY },
      }),
    );
  }

  static registerScanned(
    storage: FileScannedStorageServiceInterface,
    scanner: FileScanServiceInterface,
  ): DynamicModule {
    return AppRepoModuleFixture.withFileModule(
      FileModule.forRoot({
        storageServices: [storage],
        scanner,
        entities: { file: FILE_ENTITY_KEY },
      }),
    );
  }

  private static withFileModule(fileModule: DynamicModule): DynamicModule {
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
        fileModule,
      ],
    };
  }
}
