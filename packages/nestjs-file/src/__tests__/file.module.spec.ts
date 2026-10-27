import { type DynamicModule, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreModule } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmRepositoryModule } from '@concepta/nestjs-repository-typeorm';

import { FileLifecycleService } from '../domain/services/file-lifecycle.service.js';
import { FileStorageService } from '../domain/services/file-storage.service.js';
import { FILE_REPOSITORY_TOKEN } from '../file.constants.js';
import { FileModule } from '../file.module.js';
import { FileMapper } from '../infrastructure/persistence/file.mapper.js';
import { FileRepository } from '../infrastructure/persistence/file.repository.js';

import { FileEntityFixture } from './fixtures/entities/file.entity.fixture.js';
import { ormConfig } from './fixtures/ormconfig.fixture.js';
import { FakeStorageService, STORAGE_KEY } from './helpers/mock.helpers.js';

class OwnFileRepository extends FileRepository {
  get mapperUsed() {
    return this.mapper;
  }
}

@Injectable()
class OwnFileLifecycleService extends FileLifecycleService {}

function withFileEntity(fileModule: DynamicModule) {
  return [
    CoreModule.forRoot(),
    TypeOrmModule.forRoot(ormConfig),
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmRepositoryModule,
          entities: [{ key: 'file', entity: FileEntityFixture }],
        },
      ],
    }),
    fileModule,
  ];
}

describe('FileModule', () => {
  it('builds its own repository and registers the storage services', async () => {
    const storage = new FakeStorageService();

    const moduleRef = await Test.createTestingModule({
      imports: withFileEntity(
        FileModule.forRoot({
          storageServices: [storage],
          entities: { file: 'file' },
        }),
      ),
    }).compile();

    expect(moduleRef.get(FILE_REPOSITORY_TOKEN)).toBeInstanceOf(FileRepository);
    expect(moduleRef.get(FileStorageService).resolve(STORAGE_KEY)).toBe(
      storage,
    );

    await moduleRef.close();
  });

  it('builds a FileRepository subclass from repositories.file', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: withFileEntity(
        FileModule.forRoot({
          storageServices: [],
          entities: { file: 'file' },
          repositories: { file: OwnFileRepository },
        }),
      ),
    }).compile();

    const built = moduleRef.get(FILE_REPOSITORY_TOKEN);
    expect(built).toBeInstanceOf(OwnFileRepository);
    expect(built.mapperUsed).toBe(moduleRef.get(FileMapper));

    await moduleRef.close();
  });

  it('accepts storage services from forRootAsync', async () => {
    const storage = new FakeStorageService();

    const moduleRef = await Test.createTestingModule({
      imports: withFileEntity(
        FileModule.forRootAsync({
          useFactory: () => ({ storageServices: [storage] }),
          entities: { file: 'file' },
        }),
      ),
    }).compile();

    expect(moduleRef.get(FileStorageService).resolve(STORAGE_KEY)).toBe(
      storage,
    );

    await moduleRef.close();
  });

  it('registers non-globally with register and registerAsync', async () => {
    const storage = new FakeStorageService();

    for (const fileModule of [
      FileModule.register({
        storageServices: [storage],
        entities: { file: 'file' },
      }),
      FileModule.registerAsync({
        useFactory: () => ({ storageServices: [storage] }),
        entities: { file: 'file' },
      }),
    ]) {
      expect(fileModule.global).toEqual(false);

      const moduleRef = await Test.createTestingModule({
        imports: withFileEntity(fileModule),
      }).compile();

      expect(moduleRef.get(FileStorageService).resolve(STORAGE_KEY)).toBe(
        storage,
      );

      await moduleRef.close();
    }
  });

  it('lets providers replace FileLifecycleService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: withFileEntity(
        FileModule.forRoot({
          storageServices: [],
          entities: { file: 'file' },
          providers: [
            {
              provide: FileLifecycleService,
              useClass: OwnFileLifecycleService,
            },
          ],
        }),
      ),
    }).compile();

    expect(moduleRef.get(FileLifecycleService)).toBeInstanceOf(
      OwnFileLifecycleService,
    );

    await moduleRef.close();
  });

  it('refuses to start when the file entity is not registered', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          RepositoryModule.forRoot({}),
          FileModule.forRoot({
            storageServices: [],
            entities: { file: 'file' },
            repositories: { file: OwnFileRepository },
          }),
        ],
      }).compile(),
    ).rejects.toThrow('asks for "file", which is not registered');
  });
});
