import { type Repository } from 'typeorm';

import { TypeOrmRepository } from '../../../repository/typeorm-repository.js';

interface TestEntity {
  id: string;
}

class TestEntityClass {
  id!: string;
}

export function mockTypeOrmRepository(): TypeOrmRepository<TestEntity> {
  const repo = {
    metadata: {
      name: 'TestEntity',
      targetName: 'TestEntity',
      columns: [
        {
          propertyName: 'id',
          isPrimary: true,
          isDeleteDate: false,
          isVersion: false,
        },
      ],
      relations: [],
    },
    target: TestEntityClass,
  } as unknown as Repository<TestEntity>;

  return new TypeOrmRepository(repo, { entityKey: 'test-entity' });
}
