import { type PlainLiteralObject } from '@nestjs/common';

import { columnFixture } from '../../__fixtures__/column-metadata.fixture.js';
import {
  EMPLOYEE_COLUMNS,
  EMPLOYEE_METADATA,
  type EmployeeFixture,
} from '../../__fixtures__/relation/employee.fixture.js';
import { RecordingRepositoryFixture } from '../../__fixtures__/relation/recording-repository.fixture.js';
import { InvalidColumnValueException } from '../../exceptions/invalid-column-value.exception.js';
import { PrimaryKeyImmutableException } from '../../exceptions/primary-key-immutable.exception.js';
import { RelationWriteException } from '../../exceptions/relation-write.exception.js';
import { UnknownColumnException } from '../../exceptions/unknown-column.exception.js';
import {
  type RowScopeInterface,
  type RowScopeQueryParams,
  type RowScopeWriteParams,
} from '../../row-scope/interfaces/row-scope.interface.js';
import { type RepositoryMetadataInterface } from '../interfaces/repository-metadata.interface.js';
import { type WhereClause } from '../interfaces/where-clause.interface.js';

const employee: EmployeeFixture = { id: 'e1' };

async function refusal(write: Promise<unknown>): Promise<unknown> {
  return write.then(
    () => undefined,
    (caught: unknown) => caught,
  );
}

async function expectRefused(
  write: Promise<unknown>,
  relation: string,
  foreignKey: string[],
): Promise<void> {
  const error = await refusal(write);
  expect(error).toBeInstanceOf(RelationWriteException);
  if (error instanceof RelationWriteException) {
    expect(error.context).toEqual(
      expect.objectContaining({ entityName: 'Employee', relation, foreignKey }),
    );
    expect(error.httpStatus).toBe(400);
  }
}

describe('relations in write payloads', () => {
  it.each([
    ['an owning relation object', 'department', { id: 'd1' }, ['departmentId']],
    ['an owning relation as a bare key', 'department', 'd1', ['departmentId']],
    ['an owning relation as null', 'department', null, ['departmentId']],
    ['a one-to-many', 'reports', [{ id: 'e2' }], []],
    ['an empty one-to-many', 'reports', [], []],
    ['a one-to-many as null', 'reports', null, []],
    ['an inverse relation', 'badge', { id: 'b1' }, []],
  ])('refuses %s', async (_case, relation, value, foreignKey) => {
    const repo = new RecordingRepositoryFixture('employees');
    repo.bind({});

    await expectRefused(
      repo.update(employee, { [relation]: value }),
      relation,
      foreignKey,
    );
    expect(repo.written).toEqual([]);
  });

  it('names the foreign key column to send instead', async () => {
    const repo = new RecordingRepositoryFixture('employees');
    repo.bind({});

    await expect(
      repo.create({ id: 'e1', department: { id: 'd1' } }),
    ).rejects.toThrow('send its foreign key departmentId instead');
  });

  it('writes an owning relation through its foreign key column', async () => {
    const repo = new RecordingRepositoryFixture('employees');
    repo.bind({});

    await repo.create({ id: 'e1', departmentId: 'd1' });

    expect(repo.written).toEqual([{ id: 'e1', departmentId: 'd1' }]);
  });

  it('names no column for a foreign key held only by its relation', async () => {
    class MentoredRepository extends RecordingRepositoryFixture {
      override readonly metadata: RepositoryMetadataInterface<EmployeeFixture> =
        {
          ...EMPLOYEE_METADATA,
          relations: [
            {
              name: 'mentor',
              targetEntity: 'Employee',
              targetUrn: 'urn:memory:Employee',
              targetColumns: EMPLOYEE_COLUMNS,
              cardinality: 'one',
              on: { from: 'mentor', to: 'id' },
              foreignKey: [{ from: 'mentor', to: 'id' }],
            },
          ],
        };
    }
    const repo = new MentoredRepository('employees');
    repo.bind({});

    await expectRefused(repo.update(employee, { mentor: 'e2' }), 'mentor', []);
  });

  // TypeORM reads an object in a join column as the related row and writes
  // its key, so the checks above the driver would read a different value.
  const objectKeys: [string, PlainLiteralObject, string][] = [
    ['a foreign key', { id: 'e1', departmentId: { id: 'd2' } }, 'departmentId'],
    ['a primary key', { id: { id: 'e9' } }, 'id'],
  ];

  it.each(objectKeys)(
    'refuses an object in %s column',
    async (_case, body, column) => {
      const repo = new RecordingRepositoryFixture('employees');
      repo.bind({});

      const error = await refusal(repo.create(body));

      expect(error).toBeInstanceOf(InvalidColumnValueException);
      if (error instanceof InvalidColumnValueException) {
        expect(error.context.properties).toEqual([column]);
      }
      expect(repo.written).toEqual([]);
    },
  );

  it.each([
    ['binary', Buffer.from([1, 2])],
    ['a date', new Date('2026-01-01')],
  ])('accepts %s as a key value', async (_case, departmentId) => {
    const repo = new RecordingRepositoryFixture('employees');
    repo.bind({});

    await repo.create({ id: 'e1', departmentId });

    expect(repo.written).toEqual([{ id: 'e1', departmentId }]);
  });

  it('does not modify the caller’s payload', async () => {
    const repo = new RecordingRepositoryFixture('employees');
    repo.bind({});
    const payload = { id: 'e1', department: undefined };

    await repo.create(payload);

    expect(payload).toEqual({ id: 'e1', department: undefined });
    expect(Object.keys(payload)).toEqual(['id', 'department']);
  });

  it('ignores a relation that is undefined', async () => {
    const repo = new RecordingRepositoryFixture('employees');
    repo.bind({});

    await repo.update(employee, {
      department: undefined,
      reports: undefined,
      name: 'x',
    });

    expect(repo.written.map((data) => Object.keys(data))).toEqual([['name']]);
  });

  describe('every write entry point', () => {
    it.each([
      [
        'create',
        (repo: RecordingRepositoryFixture) =>
          repo.create({ id: 'e1', department: { id: 'd1' } }),
      ],
      [
        'createMany',
        (repo: RecordingRepositoryFixture) =>
          repo.createMany([
            { id: 'e1' },
            { id: 'e2', department: { id: 'd1' } },
          ]),
      ],
      [
        'upsert',
        (repo: RecordingRepositoryFixture) =>
          repo.upsert({ id: 'e1', department: { id: 'd1' } }),
      ],
      [
        'update',
        (repo: RecordingRepositoryFixture) =>
          repo.update(employee, { department: { id: 'd1' } }),
      ],
      [
        'replace',
        (repo: RecordingRepositoryFixture) =>
          repo.replace(employee, { department: { id: 'd1' } }),
      ],
    ])('refuses on %s before the driver is reached', async (_op, write) => {
      const repo = new RecordingRepositoryFixture('employees');
      repo.bind({});

      await expectRefused(write(repo), 'department', ['departmentId']);
      expect(repo.written).toEqual([]);
    });
  });

  describe('only the entity’s own columns reach the driver', () => {
    /**
     * A driver may read a relation from a key other than its name (TypeORM
     * reads a lazy relation from `__reports__`), so anything that is not a
     * column is refused rather than passed on.
     */
    it('refuses a property that is not a column', async () => {
      const repo = new RecordingRepositoryFixture('employees');
      repo.bind({});
      const body: PlainLiteralObject = {
        id: 'e1',
        __reports__: [{ id: 'e2' }],
      };

      const error = await refusal(repo.create(body));

      expect(error).toBeInstanceOf(UnknownColumnException);
      if (error instanceof UnknownColumnException) {
        expect(error.context.properties).toEqual(['__reports__']);
        expect(error.httpStatus).toBe(400);
      }
      expect(repo.written).toEqual([]);
    });

    /**
     * A driver may emit a function value as raw SQL, so a column only ever
     * takes a value.
     */
    it('refuses a function in place of a column value', async () => {
      const repo = new RecordingRepositoryFixture('employees');
      repo.bind({});

      const error = await refusal(
        repo.create({ id: 'e1', name: () => '(SELECT 1)' }),
      );

      expect(error).toBeInstanceOf(InvalidColumnValueException);
      if (error instanceof InvalidColumnValueException) {
        expect(error.context.properties).toEqual(['name']);
      }
      expect(repo.written).toEqual([]);
    });

    it('leaves off a property with no value', async () => {
      const repo = new RecordingRepositoryFixture('employees');
      repo.bind({});
      const body: PlainLiteralObject = { id: 'e1', extra: undefined };

      await repo.create(body);

      expect(repo.written.map((row) => Object.keys(row))).toEqual([['id']]);
    });

    it('never passes on a property inherited from the payload’s prototype', async () => {
      const repo = new RecordingRepositoryFixture('employees');
      repo.bind({});
      const payload: EmployeeFixture = Object.assign(
        Object.create({ reports: [{ id: 'e2' }] }),
        { id: 'e1' },
      );

      await repo.create(payload);

      expect(repo.written).toEqual([{ id: 'e1' }]);
      expect(Object.getPrototypeOf(repo.written[0])).toBe(Object.prototype);
    });

    it('reduces the row an update targets to its columns', async () => {
      const repo = new RecordingRepositoryFixture('employees');
      repo.bind({});
      const stored: EmployeeFixture = {
        id: 'e1',
        name: 'x',
        __reports__: [{ id: 'e2' }],
        reports: [{ id: 'e3' }],
        department: { id: 'd9' },
      };

      await repo.update(stored, { name: 'y' });

      expect(repo.targets.map((row) => Object.keys(row))).toEqual([
        ['id', 'name'],
      ]);
    });

    /**
     * The target goes to the driver as given: nothing the entity class
     * initializes is added to it, whether a relation a driver would read as
     * "unlink" or a column it would write over the stored value.
     */
    it('adds nothing an entity class initializes to the target', async () => {
      class InitializedEntity implements EmployeeFixture {
        [key: string]: unknown;
        declare id: string;
        name = 'default';
        department = null;
        badge = null;
      }
      class InitializedRepository extends RecordingRepositoryFixture {
        override readonly metadata: RepositoryMetadataInterface<EmployeeFixture> =
          { ...EMPLOYEE_METADATA, type: InitializedEntity };
      }
      const repo = new InitializedRepository('employees');
      repo.bind({});

      await repo.update({ id: 'e1' }, { name: 'y' });

      expect(repo.targets.map((row) => Object.keys(row))).toEqual([['id']]);
    });
  });

  /**
   * The resolver's returned value is what is written, so it cannot move the
   * write to another row either.
   */
  describe('a primary key a row-scope resolver changes', () => {
    class ChangesKey implements RowScopeInterface {
      scopeQuery<Options extends { where?: WhereClause }>(
        params: RowScopeQueryParams<Options>,
      ): Options {
        return params.options;
      }
      scopeWrite<Value extends PlainLiteralObject>(
        params: RowScopeWriteParams<Value>,
      ): Value {
        return { ...params.value, id: 'e9' };
      }
    }

    it.each([
      [
        'update',
        (repo: RecordingRepositoryFixture) =>
          repo.update(employee, { name: 'x' }),
      ],
      [
        'replace',
        (repo: RecordingRepositoryFixture) =>
          repo.replace(employee, { name: 'x' }),
      ],
      [
        'upsert',
        (repo: RecordingRepositoryFixture) =>
          repo.upsert({ id: 'e1', name: 'x' }),
      ],
    ])('is refused on %s', async (_op, write) => {
      const repo = new RecordingRepositoryFixture('employees');
      repo.bind({ rowScope: { access: 'scoped', resolver: ChangesKey } });
      repo.setRowScopeResolver(new ChangesKey());

      await expect(write(repo)).rejects.toThrow(PrimaryKeyImmutableException);
      expect(repo.written).toEqual([]);
    });
  });

  /**
   * A resolver's returned value goes to the driver, so the guard runs on it
   * too: a custom `scopeWrite` cannot put a relation back.
   */
  describe('a relation a row-scope resolver adds', () => {
    class AddsRelation implements RowScopeInterface {
      scopeQuery<Options extends { where?: WhereClause }>(
        params: RowScopeQueryParams<Options>,
      ): Options {
        return params.options;
      }
      scopeWrite<Value extends PlainLiteralObject>(
        params: RowScopeWriteParams<Value>,
      ): Value {
        return { ...params.value, reports: [{ id: 'e2' }] };
      }
    }

    class SoftDeletableRepository extends RecordingRepositoryFixture {
      override readonly metadata: RepositoryMetadataInterface<EmployeeFixture> =
        {
          ...EMPLOYEE_METADATA,
          columns: [
            ...EMPLOYEE_COLUMNS,
            columnFixture('dateDeleted', { isRemoveDate: true }),
          ],
        };
    }

    function scopedRepository(): RecordingRepositoryFixture {
      const repo = new SoftDeletableRepository('employees');
      repo.bind({ rowScope: { access: 'scoped', resolver: AddsRelation } });
      repo.setRowScopeResolver(new AddsRelation());
      return repo;
    }

    it('is refused on a write', async () => {
      const repo = scopedRepository();

      await expectRefused(repo.create({ id: 'e1' }), 'reports', []);
      expect(repo.written).toEqual([]);
    });

    /**
     * A driver can cascade a delete, soft delete or restore to the rows a
     * relation holds, so it never reaches the driver on these either.
     */
    it.each([
      ['delete', (repo: RecordingRepositoryFixture) => repo.delete(employee)],
      [
        'deleteMany',
        (repo: RecordingRepositoryFixture) => repo.deleteMany([employee]),
      ],
      [
        'softDelete',
        (repo: RecordingRepositoryFixture) => repo.softDelete(employee),
      ],
      ['restore', (repo: RecordingRepositoryFixture) => repo.restore(employee)],
    ])('is removed before %s reaches the driver', async (_op, remove) => {
      const repo = scopedRepository();

      await remove(repo);

      expect(repo.removed.map((row) => Object.keys(row))).toEqual([['id']]);
    });
  });
});
