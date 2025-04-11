import { getDataSourceToken } from '@nestjs/typeorm';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { LookupService } from './lookup.service';

import { AppModuleFixture } from '../__fixtures__/app.module.fixture';
import { TestModuleFixture } from '../__fixtures__/test.module.fixture';
import { TestEntityFixture } from '../__fixtures__/test.entity.fixture';
import { TestLookupServiceFixture } from '../__fixtures__/services/test-lookup.service.fixture';
import { TestFactoryFixture } from '../__fixtures__/test.factory.fixture';

describe(LookupService, () => {
  const RANDOM_UUID = '3bfd065e-0c30-11ed-861d-0242ac120002';
  let app: INestApplication;
  let testModuleFixture: TestModuleFixture;
  let testLookupService: TestLookupServiceFixture;
  let seedingSource: SeedingSource;
  let testObject: TestEntityFixture;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    app = moduleFixture.createNestApplication();
    testModuleFixture = moduleFixture.get<TestModuleFixture>(TestModuleFixture);

    testLookupService = moduleFixture.get<TestLookupServiceFixture>(
      TestLookupServiceFixture,
    );

    seedingSource = new SeedingSource({
      dataSource: app.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    const userFactory = new TestFactoryFixture({
      entity: TestEntityFixture,
      seedingSource,
    });

    testObject = await userFactory.create();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be loaded', async () => {
    expect(testModuleFixture).toBeInstanceOf(TestModuleFixture);
    expect(testLookupService).toBeInstanceOf(TestLookupServiceFixture);
  });

  describe(LookupService.prototype.byId, () => {
    it('success', async () => {
      const result = await testLookupService.byId(testObject.id);

      expect(result).toBeInstanceOf(TestEntityFixture);
      expect(result?.version).toBe(testObject.version);
    });

    it('wrong id', async () => {
      const result = await testLookupService.byId(RANDOM_UUID);
      expect(result?.version).toBe(undefined);
    });
  });
});
