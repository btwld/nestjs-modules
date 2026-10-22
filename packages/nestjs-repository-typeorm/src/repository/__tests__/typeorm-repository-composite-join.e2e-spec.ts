import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  RepositoryModule,
} from '@concepta/nestjs-repository';

import {
  TenantOrderEntityFixture,
  TenantOrderLineEntityFixture,
} from '../../__fixtures__/repository/entity/tenant-order.entity.fixture.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';
import { type TypeOrmRepository } from '../typeorm-repository.js';

const ORDERS = 'tenant-orders';
const LINES = 'tenant-order-lines';

describe('TypeOrmRepository composite foreign key metadata (e2e)', () => {
  let moduleRef: TestingModule;
  let orders: TypeOrmRepository<TenantOrderEntityFixture>;
  let lines: TypeOrmRepository<TenantOrderLineEntityFixture>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          entities: [TenantOrderEntityFixture, TenantOrderLineEntityFixture],
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmRepositoryModule,
              entities: [
                { key: ORDERS, entity: TenantOrderEntityFixture },
                { key: LINES, entity: TenantOrderLineEntityFixture },
              ],
            },
          ],
        }),
      ],
    }).compile();

    orders = moduleRef.get(getDynamicRepositoryToken(ORDERS));
    lines = moduleRef.get(getDynamicRepositoryToken(LINES));
  });

  afterAll(() => moduleRef.close());

  it('reports every column pair of the owning side, matching rows by the primary key', () => {
    const relation = lines.metadata.relations?.find(
      ({ name }) => name === 'order',
    );

    expect(relation?.on).toEqual({ from: 'orderId', to: 'id' });
    expect(relation?.joinOn).toEqual([
      { from: 'orderId', to: 'id' },
      { from: 'tenantId', to: 'tenantId' },
    ]);
    expect(relation?.foreignKey).toEqual(relation?.joinOn);
  });

  it('reports every column pair of the inverse side, swapped', () => {
    const relation = orders.metadata.relations?.find(
      ({ name }) => name === 'lines',
    );

    expect(relation?.on).toEqual({ from: 'id', to: 'orderId' });
    expect(relation?.joinOn).toEqual([
      { from: 'id', to: 'orderId' },
      { from: 'tenantId', to: 'tenantId' },
    ]);
    expect(relation?.foreignKey).toEqual(undefined);
  });
});
