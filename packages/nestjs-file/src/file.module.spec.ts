import { type DynamicModule, type ModuleMetadata } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  type RepositoryInterface,
  getDynamicRepositoryToken,
  type FileEntityInterface,
} from '@concepta/nestjs-common';
import {
  TypeOrmExtModule,
  TypeOrmRepositoryAdapter,
} from '@concepta/nestjs-typeorm-ext';

import { FILE_MODULE_FILE_ENTITY_KEY } from './file.constants';
import { FileModule } from './file.module';
import { FileService } from './services/file.service';

import { AwsStorageService } from './__fixtures__/aws-storage.service';
import {
  AWS_KEY_FIXTURE,
  DOWNLOAD_URL_FIXTURE,
  FILE_NAME_FIXTURE,
  UPLOAD_URL_FIXTURE,
} from './__fixtures__/constants.fixture';
import { FileEntityFixture } from './__fixtures__/file/file-entity.fixture';
import { FileStorageModuleFixture } from './__fixtures__/file-storage.module.fixture';
import { UserEntityFixture } from './__fixtures__/user/entities/user.entity.fixture';

describe(FileModule, () => {
  let testModule: TestingModule;
  let fileModule: FileModule;
  let fileService: FileService;
  let fileDynamicRepo: RepositoryInterface<FileEntityInterface>;

  describe(FileModule.forRoot, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          TypeOrmExtModule.forFeature({
            file: {
              entity: FileEntityFixture,
            },
          }),
          FileModule.forRoot({
            storageServices: [new AwsStorageService()],
          }),
        ]),
      ).compile();
      commonVars();
    });

    it('module should be loaded', async () => {
      commonTests();
    });
  });

  describe(FileModule.register, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          TypeOrmExtModule.forFeature({
            file: {
              entity: FileEntityFixture,
            },
          }),
          FileModule.register({
            storageServices: [new AwsStorageService()],
          }),
        ]),
      ).compile();
      commonVars();
    });

    it('module should be loaded', async () => {
      commonTests();
    });
  });

  describe(FileModule.forRootAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          FileModule.forRootAsync({
            imports: [
              TypeOrmExtModule.forFeature({
                file: {
                  entity: FileEntityFixture,
                },
              }),
            ],
            inject: [AwsStorageService],
            useFactory: (awsStorageService: AwsStorageService) => ({
              storageServices: [awsStorageService],
            }),
          }),
        ]),
      ).compile();
      commonVars();
    });

    it('module should be loaded', async () => {
      commonTests();
    });
    it('make sure to push a new file and get upload and download url', async () => {
      const result = await fileService.push({
        fileName: 'test.pdf',
        serviceKey: AWS_KEY_FIXTURE,
        contentType: 'application/pdf',
      });
      expect(result.uploadUri).toBe(UPLOAD_URL_FIXTURE);
      expect(result.downloadUrl).toBe(DOWNLOAD_URL_FIXTURE);
    });
  });

  describe(FileModule.registerAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          FileModule.registerAsync({
            imports: [
              TypeOrmExtModule.forFeature({
                file: {
                  entity: FileEntityFixture,
                },
              }),
            ],
            inject: [AwsStorageService],
            useFactory: (awsStorageService: AwsStorageService) => ({
              storageServices: [awsStorageService],
            }),
          }),
        ]),
      ).compile();
    });

    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  const commonVars = () => {
    fileModule = testModule.get(FileModule);
    fileService = testModule.get(FileService);
    fileDynamicRepo = testModule.get(
      getDynamicRepositoryToken(FILE_MODULE_FILE_ENTITY_KEY),
    );
  };

  const commonTests = async () => {
    expect(fileModule).toBeInstanceOf(FileModule);
    expect(fileService).toBeInstanceOf(FileService);
    expect(fileDynamicRepo).toBeInstanceOf(TypeOrmRepositoryAdapter);

    const result = await fileService.push({
      fileName: FILE_NAME_FIXTURE,
      serviceKey: AWS_KEY_FIXTURE,
      contentType: 'application/pdf',
    });
    expect(result.serviceKey).toBe(AWS_KEY_FIXTURE);
    expect(result.fileName).toBe(FILE_NAME_FIXTURE);
    expect(result.uploadUri).toBe(UPLOAD_URL_FIXTURE);
    expect(result.downloadUrl).toBe(DOWNLOAD_URL_FIXTURE);
  };
});

function testModuleFactory(
  extraImports: DynamicModule['imports'] = [],
): ModuleMetadata {
  return {
    imports: [
      TypeOrmExtModule.forRoot({
        type: 'sqlite',
        database: ':memory:',
        synchronize: true,
        entities: [UserEntityFixture, FileEntityFixture],
      }),
      FileStorageModuleFixture,
      ...extraImports,
    ],
  };
}
