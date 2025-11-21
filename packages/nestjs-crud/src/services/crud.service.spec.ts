import { mock } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { Inject, Injectable, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { TypeOrmCrudAdapter } from '../crud/adapters/typeorm-crud.adapter';
import { CrudCreateManyInterface } from '../crud/interfaces/crud-create-many.interface';
import { CrudRequestInterface } from '../crud/interfaces/crud-request.interface';
import { CrudServiceQueryOptionsInterface } from '../crud/interfaces/crud-service-query-options.interface';

import { CrudService } from './crud.service';
import { CrudQueryHelper } from './helpers/crud-query.helper';

jest.mock('../crud/adapters/typeorm-crud.adapter');

describe(CrudService.name, () => {
  // fake entity/repo
  class Thing {
    name!: string;
  }

  class ThingRepository extends Repository<Thing> {}

  // test orm service
  @Injectable()
  class TestCrudAdapter extends TypeOrmCrudAdapter<Thing> {}

  class TestCrudService extends CrudService<Thing> {
    constructor(
      @Inject(TestCrudAdapter)
      protected readonly crudAdapter: TestCrudAdapter,
    ) {
      super(crudAdapter);
    }
  }

  let ormService: TestCrudService;
  let mockRequest: CrudRequestInterface<Thing>;
  let mockOverrides: CrudServiceQueryOptionsInterface<Thing>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TestCrudAdapter,
        TestCrudService,
        CrudQueryHelper,
        { provide: Repository, useValue: mock(ThingRepository) },
      ],
    }).compile();

    ormService = moduleRef.get<TestCrudService>(TestCrudService);

    mockRequest = {
      options: {},
      parsed: { search: { name: 'apple' } },
    } as unknown as CrudRequestInterface<Thing>;

    mockOverrides = {
      filter: { name: 'pear' },
    };
  });

  afterEach(async () => {
    jest.resetAllMocks();
  });

  describe('simple crud methods', () => {
    type SingleArg = keyof Pick<
      TestCrudService,
      'getMany' | 'getOne' | 'deleteOne'
    >;

    const crudMethods: SingleArg[] = ['getMany', 'getOne', 'deleteOne'];

    it.each(crudMethods)(
      '%s should use custom options',
      async (crudMethod: SingleArg) => {
        const spy = jest.spyOn(TypeOrmCrudAdapter.prototype, crudMethod);

        await ormService[crudMethod](mockRequest, mockOverrides);

        expect(spy).toHaveBeenCalledTimes(1);

        expect(spy).toHaveBeenCalledWith({
          options: { query: {} },
          parsed: {
            search: { $and: [{ name: 'apple' }, { name: 'pear' }] },
          },
        });
      },
    );
  });

  describe('complex crud methods (have dto argument)', () => {
    type DoubleArg = keyof Pick<
      TestCrudService,
      'createMany' | 'createOne' | 'updateOne' | 'replaceOne'
    >;

    const crudMethods: DoubleArg[] = [
      'createMany',
      'createOne',
      'updateOne',
      'replaceOne',
    ];

    it.each(crudMethods)(
      '%s should use custom options',
      async (crudMethod: DoubleArg) => {
        const spy = jest.spyOn(TypeOrmCrudAdapter.prototype, crudMethod);

        let dto: Type<Thing> | CrudCreateManyInterface<Type<Thing>>;

        if (crudMethod === 'createMany') {
          dto = { bulk: [class extends Thing {}] };
          await ormService[crudMethod](mockRequest, dto, mockOverrides);
        } else {
          dto = class extends Thing {};
          await ormService[crudMethod](mockRequest, dto, mockOverrides);
        }

        expect(spy).toHaveBeenCalledTimes(1);

        expect(spy).toHaveBeenCalledWith(
          {
            options: { query: {} },
            parsed: {
              search: { $and: [{ name: 'apple' }, { name: 'pear' }] },
            },
          },
          dto,
        );
      },
    );
  });
});
