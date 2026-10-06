import { createMockRepository } from '@concepta/nestjs-repository/testing';

import { CrudAdapter } from '../../../../../infrastructure/adapters/crud.adapter.js';

export interface TestEntity {
  id: string;
  name: string;
}

export class TestCrudAdapter extends CrudAdapter<TestEntity> {
  decidePagination(): boolean {
    return true;
  }
}

export const relationsWithPosts = {
  rootKey: 'id' as const,
  relations: [
    {
      property: 'posts',
      cardinality: 'many' as const,
      entity: 'PostEntity',
      primaryKey: 'id',
      foreignKey: 'authorId',
    },
  ] as never,
};

export function createTestAdapter(): TestCrudAdapter {
  return new TestCrudAdapter(
    createMockRepository<TestEntity>({
      name: 'TestEntity',
      columns: [
        { name: 'id', isPrimary: true, isRemoveDate: false, isVersion: false },
        {
          name: 'name',
          isPrimary: false,
          isRemoveDate: false,
          isVersion: false,
        },
      ],
    }),
  );
}
