import { randomUUID } from 'crypto';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import {
  ModelMutateException,
  ModelValidationException,
  ModelIdNoMatchException,
  ModelService,
} from '@concepta/nestjs-common';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { TestModelServiceFixture } from '../__fixtures__/model/test-model.service.fixture';
import { AppModuleFixture } from '../__fixtures__/repository/app.module.fixture';
import { TestEntityFixture } from '../__fixtures__/repository/test.entity.fixture';
import { TestFactoryFixture } from '../__fixtures__/repository/test.factory.fixture';
import { TestModuleFixture } from '../__fixtures__/repository/test.module.fixture';

describe(ModelService, () => {
  const WRONG_UUID = '3bfd065e-0c30-11ed-861d-0242ac120002';
  let app: INestApplication;
  let testModuleFixture: TestModuleFixture;
  let testModelService: TestModelServiceFixture;
  let seedingSource: SeedingSource;
  let testFactory: TestFactoryFixture;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleFixture],
    }).compile();

    app = moduleFixture.createNestApplication();
    testModuleFixture = moduleFixture.get<TestModuleFixture>(TestModuleFixture);

    testModelService = moduleFixture.get<TestModelServiceFixture>(
      TestModelServiceFixture,
    );

    seedingSource = new SeedingSource({
      dataSource: app.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    testFactory = new TestFactoryFixture({
      entity: TestEntityFixture,
      seedingSource,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be loaded', async () => {
    expect(testModuleFixture).toBeInstanceOf(TestModuleFixture);
  });

  describe(ModelService.prototype.byId, () => {
    it('success', async () => {
      const testObject = await testFactory.create();
      const result = await testModelService.byId(testObject.id);

      expect(result).toBeInstanceOf(TestEntityFixture);
      expect(result?.version).toBe(testObject.version);
    });

    it('wrong id', async () => {
      const result = await testModelService.byId(randomUUID());
      expect(result?.version).toBe(undefined);
    });
  });

  describe(ModelService.prototype.create, () => {
    it('success', async () => {
      const savedData = await testModelService.create({
        firstName: 'Bob',
      });

      expect(savedData).toBeInstanceOf(TestEntityFixture);
      expect(savedData.id.length).toBeGreaterThan(0);
      expect(savedData.version).toEqual(1);
    });

    it('exception', async () => {
      jest
        .spyOn(testModelService['repo'], 'save')
        .mockImplementationOnce(() => {
          throw Error();
        });

      const t = async () => {
        return testModelService.create({ firstName: 'Bob' });
      };

      await expect(t).rejects.toThrow(ModelMutateException);
    });

    it('invalid', async () => {
      const t = async () => {
        return testModelService.create({ firstName: 'B' });
      };

      await expect(t).rejects.toThrow(ModelValidationException);
    });
  });

  describe(ModelService.prototype.update, () => {
    it('success', async () => {
      const testObject = await testFactory.create({ firstName: 'Bob' });

      expect(testObject.firstName).toBe('Bob');
      expect(testObject.version).toBe(1);

      const entity = await testModelService.update({
        id: testObject.id,
        firstName: 'Bill',
      });

      expect(entity).toBeInstanceOf(TestEntityFixture);
      expect(entity.firstName).toBe('Bill');
      expect(entity.version).toBe(2);
    });

    it('not found', async () => {
      const t = async () => {
        return testModelService.update({
          id: WRONG_UUID,
        });
      };

      await expect(t()).rejects.toThrow(ModelIdNoMatchException);
    });

    it('found but not valid', async () => {
      const testObject = await testFactory.create();
      const t = async () => {
        return testModelService.update({
          id: testObject.id,
          firstName: 'A',
        });
      };

      await expect(t).rejects.toThrow(ModelValidationException);
    });

    it('found, valid, but exception on save', async () => {
      const testObject = await testFactory.create();

      jest
        .spyOn(testModelService['repo'], 'save')
        .mockImplementationOnce(() => {
          throw new Error();
        });

      const t = async () => {
        return testModelService.update({
          id: testObject.id,
        });
      };

      await expect(t).rejects.toThrow(ModelMutateException);
    });
  });

  describe(ModelService.prototype.replace, () => {
    it('success', async () => {
      const pastDate = new Date();
      pastDate.setMilliseconds(pastDate.getMilliseconds() - 100);
      const testObject = await testFactory.create({
        firstName: 'Bob',
        dateCreated: pastDate,
        dateUpdated: pastDate,
        dateDeleted: null,
        version: 5,
      });

      expect(testObject).toBeInstanceOf(TestEntityFixture);
      expect(testObject.firstName).toEqual('Bob');
      expect(testObject.version).toEqual(5);

      const entity = await testModelService.replace({
        id: testObject.id,
        firstName: 'Bill',
      });

      expect(entity).toBeInstanceOf(TestEntityFixture);
      expect(entity.firstName).toEqual('Bill');
      expect(entity.dateCreated).toEqual(testObject.dateCreated);
      expect(entity.dateUpdated).not.toEqual(testObject.dateUpdated);
      expect(entity.dateDeleted).toEqual(null);
      expect(entity.version).toEqual(6);
    });

    it('not found', async () => {
      const t = async () => {
        return testModelService.replace({
          id: WRONG_UUID,
          firstName: 'Bill',
        });
      };

      await expect(t).rejects.toThrow(ModelIdNoMatchException);
    });

    it('found but not valid', async () => {
      const testObject = await testFactory.create();

      const t = async () => {
        return testModelService.replace({
          id: testObject.id,
          firstName: 'B',
        });
      };

      await expect(t).rejects.toThrow(ModelValidationException);
    });

    it('found, valid, but exception on save', async () => {
      const testObject = await testFactory.create();

      jest
        .spyOn(testModelService['repo'], 'save')
        .mockImplementationOnce(() => {
          throw new Error();
        });

      const t = async () => {
        return testModelService.replace({
          id: testObject.id,
          firstName: 'Bill',
        });
      };

      await expect(t).rejects.toThrow(ModelMutateException);
    });
  });

  describe(ModelService.prototype.remove, () => {
    it('success', async () => {
      const testObject = await testFactory.create();

      const remove = jest.spyOn(testModelService['repo'], 'remove');

      await testModelService.remove({ id: testObject.id });

      expect(remove).toHaveBeenCalledTimes(1);

      const foundObject = await testModelService.byId(testObject.id);

      expect(foundObject).toEqual(null);
    });

    it('id does not match', async () => {
      const t = async () => {
        return testModelService.remove({
          id: WRONG_UUID,
        });
      };

      await expect(t).rejects.toThrow(ModelIdNoMatchException);
    });

    it('exception', async () => {
      const testObject = await testFactory.create();

      const t = async () => {
        return testModelService.remove(testObject);
      };

      jest
        .spyOn(testModelService['repo'], 'remove')
        .mockImplementationOnce(() => {
          throw new Error();
        });

      await expect(t).rejects.toThrow(ModelMutateException);
    });
  });
});
