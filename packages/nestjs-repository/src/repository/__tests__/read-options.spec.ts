import { type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';

import { type EmployeeFixture } from '../../__fixtures__/relation/employee.fixture.js';
import { RecordingRepositoryFixture } from '../../__fixtures__/relation/recording-repository.fixture.js';
import { UnknownColumnException } from '../../exceptions/unknown-column.exception.js';
import {
  type RowScopeInterface,
  type RowScopeQueryParams,
  type RowScopeWriteParams,
} from '../../row-scope/interfaces/row-scope.interface.js';
import { type JoinClause } from '../interfaces/join-clause.interface.js';
import {
  type RepositoryCountOptions,
  type RepositoryFindOptions,
} from '../interfaces/repository-options.interface.js';
import { type RepositoryInterface } from '../interfaces/repository.interface.js';
import { type WhereClause } from '../interfaces/where-clause.interface.js';
import { SortOrder } from '../repository.types.js';
import { Where } from '../where.helpers.js';

/** Records the options each read hands the driver. */
class ReadRecordingFixture extends RecordingRepositoryFixture {
  readonly reads: RepositoryFindOptions<EmployeeFixture>[] = [];

  protected override async doFind(
    options: RepositoryFindOptions<EmployeeFixture> = {},
  ): Promise<EmployeeFixture[]> {
    this.reads.push(options);
    return [];
  }
  protected override async doFindOne(
    options: RepositoryFindOptions<EmployeeFixture> = {},
  ): Promise<EmployeeFixture | null> {
    this.reads.push(options);
    return null;
  }
  protected override async doCount(
    options: RepositoryCountOptions = {},
  ): Promise<number> {
    this.reads.push(options);
    return 0;
  }
  protected override async doFindAndCount(
    options: RepositoryFindOptions<EmployeeFixture> = {},
  ): Promise<[EmployeeFixture[], number]> {
    this.reads.push(options);
    return [[], 0];
  }
}

type Read = (
  repo: RepositoryInterface<EmployeeFixture>,
  options: RepositoryFindOptions<EmployeeFixture>,
) => Promise<unknown>;

const READS: [string, Read][] = [
  ['find', (repo, options) => repo.find(options)],
  ['findOne', (repo, options) => repo.findOne(options)],
  ['count', (repo, options) => repo.count(options)],
  ['findAndCount', (repo, options) => repo.findAndCount(options)],
];

/** The reads that return rows, and so take `select` and `order`. */
const ROW_READS = READS.filter(([name]) => name !== 'count');

const JOIN_DEPARTMENT: JoinClause[] = [{ relation: 'department' }];

async function refusal(read: Promise<unknown>): Promise<unknown> {
  return read.then(
    () => undefined,
    (caught: unknown) => caught,
  );
}

describe('what a read may name', () => {
  describe.each(ROW_READS)('%s', (_name, read) => {
    it('passes own columns and joined relations to the driver', async () => {
      const repo = new ReadRecordingFixture('employees');
      repo.bind({});
      const options: RepositoryFindOptions<EmployeeFixture> = {
        select: ['id', 'name'],
        join: JOIN_DEPARTMENT,
        where: Where.and(
          Where.eq('name', 'Ada'),
          Where.rel('department', Where.eq('title', 'R&D')),
        ),
        order: [
          { field: 'id', order: SortOrder.ASC },
          { field: 'title', order: SortOrder.DESC, relation: 'department' },
        ],
      };

      await read(repo, options);

      expect(repo.reads).toEqual([options]);
    });
  });

  describe.each(READS)('%s', (_name, read) => {
    it.each<[string, RepositoryFindOptions<EmployeeFixture>, string[]]>([
      [
        'a filter on a relation',
        { where: Where.gt('reports', 0) },
        ['reports'],
      ],
      [
        'a filter on a relation nested in a compound',
        { where: Where.or(Where.eq('id', 'e1'), Where.eq('badge', 'b1')) },
        ['badge'],
      ],
      [
        'a filter on an unknown field',
        { where: Where.eq('salary', 1) },
        ['salary'],
      ],
      [
        'a sort on a relation',
        { order: [{ field: 'department', order: SortOrder.ASC }] },
        ['department'],
      ],
      ['a select of a relation', { select: ['id', 'reports'] }, ['reports']],
    ])('refuses %s', async (_case, options, properties) => {
      const repo = new ReadRecordingFixture('employees');
      repo.bind({});

      const error = await refusal(read(repo, options));

      expect(error).toBeInstanceOf(UnknownColumnException);
      if (error instanceof UnknownColumnException) {
        expect(error.httpStatus).toBe(400);
        expect(error.context).toEqual(
          expect.objectContaining({ entityName: 'Employee', properties }),
        );
      }
      expect(repo.reads).toEqual([]);
    });

    it.each<[string, RepositoryFindOptions<EmployeeFixture>, string]>([
      [
        'a join on an unknown relation',
        { join: [{ relation: 'manager' }] },
        'Unknown relation "manager" on entity "Employee"',
      ],
      [
        'a filter on an unknown relation',
        { where: Where.rel('manager', Where.eq('id', 'e2')) },
        'Unknown relation "manager" on entity "Employee"',
      ],
      [
        'a filter on a relation it does not join',
        { where: Where.rel('department', Where.eq('title', 'R&D')) },
        'Cannot filter or sort on relation "department" of Employee ' +
          'without joining it. Add it to join.',
      ],
      [
        'a filter on an unjoined relation nested in a compound',
        {
          join: JOIN_DEPARTMENT,
          where: Where.and(
            Where.rel('department', Where.eq('title', 'R&D')),
            Where.or(Where.rel('reports', Where.eq('id', 'e2'))),
          ),
        },
        'Cannot filter or sort on relation "reports" of Employee ' +
          'without joining it. Add it to join.',
      ],
      [
        'a sort on a relation it does not join',
        {
          order: [
            { field: 'title', order: SortOrder.ASC, relation: 'department' },
          ],
        },
        'Cannot filter or sort on relation "department" of Employee ' +
          'without joining it. Add it to join.',
      ],
    ])('refuses %s', async (_case, options, message) => {
      const repo = new ReadRecordingFixture('employees');
      repo.bind({});

      const error = await refusal(read(repo, options));

      expect(error).toBeInstanceOf(RuntimeException);
      if (error instanceof RuntimeException) {
        expect(error.httpStatus).toBe(400);
        expect(error.message).toBe(message);
      }
      expect(repo.reads).toEqual([]);
    });
  });

  it('checks what a row scope resolver returns', async () => {
    const repo = new ReadRecordingFixture('employees');
    class FiltersOnRelation implements RowScopeInterface {
      scopeQuery<Options extends { where?: WhereClause }>(
        params: RowScopeQueryParams<Options, PlainLiteralObject>,
      ): Options {
        return { ...params.options, where: Where.gt('reports', 0) };
      }
      scopeWrite<Value extends PlainLiteralObject>(
        params: RowScopeWriteParams<Value>,
      ): Value {
        return params.value;
      }
    }
    repo.bind({ rowScope: { access: 'scoped', resolver: FiltersOnRelation } });
    repo.setRowScopeResolver(new FiltersOnRelation());

    await expect(repo.find()).rejects.toThrow(UnknownColumnException);
    expect(repo.reads).toEqual([]);
  });
});

describe('what a count may take', () => {
  const MATCHING = {
    join: JOIN_DEPARTMENT,
    where: Where.rel('department', Where.eq('title', 'R&D')),
    withDeleted: true,
  };

  it('hands the driver only which rows match', async () => {
    const repo = new ReadRecordingFixture('employees');
    repo.bind({});

    await repo.count({
      ...MATCHING,
      select: ['id'],
      order: [{ field: 'id', order: SortOrder.ASC }],
      skip: 40,
      take: 20,
    });

    expect(repo.reads).toEqual([MATCHING]);
  });

  it('hands the driver only which rows match when a row scope resolver pages', async () => {
    const repo = new ReadRecordingFixture('employees');
    class Pages implements RowScopeInterface {
      scopeQuery<Options extends { where?: WhereClause }>(
        params: RowScopeQueryParams<Options, PlainLiteralObject>,
      ): Options {
        return { ...params.options, take: 1 };
      }
      scopeWrite<Value extends PlainLiteralObject>(
        params: RowScopeWriteParams<Value>,
      ): Value {
        return params.value;
      }
    }
    repo.bind({ rowScope: { access: 'scoped', resolver: Pages } });
    repo.setRowScopeResolver(new Pages());

    await repo.count(MATCHING);

    expect(repo.reads).toEqual([MATCHING]);
  });
});
