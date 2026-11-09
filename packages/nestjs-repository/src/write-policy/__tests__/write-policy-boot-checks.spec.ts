import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { type RepositoryColumnMetadataInterface } from '../../repository/interfaces/repository-column-metadata.interface.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import { RepositoryAdapter } from '../../repository/repository-adapter.js';
import { type WritePolicyRegistration } from '../interfaces/write-policy-registration.interface.js';
import {
  checkNoSoftDeleteOnAppendOnly,
  checkWritePolicyCompleteness,
} from '../write-policy-boot-checks.js';

class EntityClass {}

/**
 * Structural only — these checks never execute an operation, so every `do*`
 * here exists to satisfy the abstract contract and nothing more.
 */
class StubAdapter extends RepositoryAdapter<PlainLiteralObject> {
  readonly metadata: RepositoryMetadataInterface<PlainLiteralObject>;

  constructor(
    entityKey: string,
    entityName: string,
    writePolicy?: WritePolicyRegistration,
    columns: RepositoryColumnMetadataInterface<PlainLiteralObject>[] = [],
  ) {
    super(entityKey);
    this.bind({ writePolicy });
    this.metadata = {
      name: entityName,
      type: EntityClass as Type<PlainLiteralObject>,
      urn: `urn:memory:${entityName}`,
      columns,
      relations: [],
    };
  }

  protected async doFind(): Promise<PlainLiteralObject[]> {
    throw new Error('structural check only');
  }
  protected async doFindOne(): Promise<PlainLiteralObject | null> {
    throw new Error('structural check only');
  }
  protected async doCount(): Promise<number> {
    throw new Error('structural check only');
  }
  protected async doFindAndCount(): Promise<[PlainLiteralObject[], number]> {
    throw new Error('structural check only');
  }
  protected async doCreate(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  protected async doCreateMany(): Promise<PlainLiteralObject[]> {
    throw new Error('structural check only');
  }
  protected async doUpdate(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  protected async doUpsert(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  protected async doReplace(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  protected async doDelete(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  protected async doDeleteMany(): Promise<PlainLiteralObject[]> {
    throw new Error('structural check only');
  }
  protected async doSoftDelete(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  protected async doRestore(): Promise<PlainLiteralObject> {
    throw new Error('structural check only');
  }
  toRow(entityLike: DeepPartial<PlainLiteralObject>): PlainLiteralObject {
    return entityLike;
  }
}

const appendOnly = {
  access: 'append-only',
  reason: 'financial lineage is retained',
} as const;
const mutable = { access: 'mutable' } as const;

const deleteDateColumn: RepositoryColumnMetadataInterface<PlainLiteralObject> =
  {
    name: 'dateDeleted',
    isPrimary: false,
    isVersion: false,
    isRemoveDate: true,
  };

describe('write policy boot checks', () => {
  describe('soft delete on an append-only entity', () => {
    it('passes when an append-only entity has no delete date column', () => {
      expect(
        checkNoSoftDeleteOnAppendOnly([
          new StubAdapter('items', 'Item', appendOnly),
        ]),
      ).toEqual([]);
    });

    /**
     * The usual cause is extending `CommonPostgresEntity` /
     * `CommonSqliteEntity`, which inherit a delete date column from
     * `Audit*Entity`.
     */
    it('fails when an append-only entity carries one', () => {
      const failures = checkNoSoftDeleteOnAppendOnly([
        new StubAdapter('items', 'Item', appendOnly, [deleteDateColumn]),
      ]);

      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain('"items"');
      expect(failures[0]).toContain('dateDeleted');
    });

    it('ignores a mutable or undeclared entity with one', () => {
      expect(
        checkNoSoftDeleteOnAppendOnly([
          new StubAdapter('a', 'A', mutable, [deleteDateColumn]),
          new StubAdapter('b', 'B', undefined, [deleteDateColumn]),
        ]),
      ).toEqual([]);
    });

    it('reports every offender, not just the first', () => {
      const failures = checkNoSoftDeleteOnAppendOnly([
        new StubAdapter('a', 'A', appendOnly, [deleteDateColumn]),
        new StubAdapter('b', 'B', appendOnly, [deleteDateColumn]),
      ]);

      expect(failures).toHaveLength(2);
    });
  });

  describe('declaration completeness', () => {
    it('passes when every entity declares a policy', () => {
      expect(
        checkWritePolicyCompleteness([
          new StubAdapter('a', 'A', appendOnly),
          new StubAdapter('b', 'B', mutable),
        ]),
      ).toEqual([]);
    });

    it('fails on an undeclared entity', () => {
      const failures = checkWritePolicyCompleteness([
        new StubAdapter('a', 'A'),
      ]);

      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain('"a"');
    });
  });
});
