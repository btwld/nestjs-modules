import { HttpStatus } from '@nestjs/common';

import { type DeepPartial } from '@concepta/nestjs-core';

import { columnFixture } from '../../__fixtures__/column-metadata.fixture.js';
import {
  EMPLOYEE_COLUMNS,
  EMPLOYEE_METADATA,
  type EmployeeFixture,
} from '../../__fixtures__/relation/employee.fixture.js';
import { RecordingRepositoryFixture } from '../../__fixtures__/relation/recording-repository.fixture.js';
import { RepositoryBootException } from '../../exceptions/repository-boot.exception.js';
import { RepositoryQueryException } from '../../exceptions/repository-query.exception.js';
import { UnknownColumnException } from '../../exceptions/unknown-column.exception.js';
import { type JoinClause } from '../interfaces/join-clause.interface.js';
import { type RepositoryMetadataInterface } from '../interfaces/repository-metadata.interface.js';
import { type RepositoryFindOptions } from '../interfaces/repository-options.interface.js';
import { SortOrder } from '../repository.types.js';
import { Where } from '../where.helpers.js';

/**
 * Answers every read with `rows`, and every write with `writeResult`, so a
 * test decides exactly what the driver hands back.
 */
class ResultFixture extends RecordingRepositoryFixture {
  override readonly metadata: RepositoryMetadataInterface<EmployeeFixture> = {
    ...EMPLOYEE_METADATA,
    columns: [
      ...EMPLOYEE_COLUMNS,
      columnFixture('dateDeleted', { isRemoveDate: true }),
    ],
  };
  rows: EmployeeFixture[] = [];
  writeResult: EmployeeFixture | undefined;
  readonly reads: RepositoryFindOptions<EmployeeFixture>[] = [];

  protected override async doFind(
    options: RepositoryFindOptions<EmployeeFixture> = {},
  ): Promise<EmployeeFixture[]> {
    this.reads.push(options);
    return this.rows;
  }
  protected override async doFindOne(
    options: RepositoryFindOptions<EmployeeFixture> = {},
  ): Promise<EmployeeFixture | null> {
    this.reads.push(options);
    return this.rows[0] ?? null;
  }
  protected override async doFindAndCount(
    options: RepositoryFindOptions<EmployeeFixture> = {},
  ): Promise<[EmployeeFixture[], number]> {
    this.reads.push(options);
    return [this.rows, this.rows.length];
  }
  protected override async doCreate(
    entity: DeepPartial<EmployeeFixture>,
  ): Promise<EmployeeFixture> {
    return this.writeResult ?? this.toRow(entity);
  }
  protected override async doUpdate(
    entity: EmployeeFixture,
  ): Promise<EmployeeFixture> {
    return this.writeResult ?? entity;
  }
  protected override async doDelete(
    entity: EmployeeFixture,
  ): Promise<EmployeeFixture> {
    return this.writeResult ?? entity;
  }
  protected override async doCreateMany(
    entities: DeepPartial<EmployeeFixture>[],
  ): Promise<EmployeeFixture[]> {
    return entities.map((entity) => this.writeResult ?? this.toRow(entity));
  }
  protected override async doUpsert(
    entity: DeepPartial<EmployeeFixture>,
  ): Promise<EmployeeFixture> {
    return this.writeResult ?? this.toRow(entity);
  }
  protected override async doReplace(
    entity: EmployeeFixture,
  ): Promise<EmployeeFixture> {
    return this.writeResult ?? entity;
  }
  protected override async doDeleteMany(
    entities: EmployeeFixture[],
  ): Promise<EmployeeFixture[]> {
    return entities.map((entity) => this.writeResult ?? entity);
  }
  protected override async doSoftDelete(
    entity: EmployeeFixture,
  ): Promise<EmployeeFixture> {
    return this.writeResult ?? entity;
  }
  protected override async doRestore(
    entity: EmployeeFixture,
  ): Promise<EmployeeFixture> {
    return this.writeResult ?? entity;
  }
}

const JOIN_DEPARTMENT: JoinClause[] = [{ relation: 'department' }];

/** A read, answering with the rows it returned. */
type Read = (
  repo: ResultFixture,
  join?: JoinClause[],
) => Promise<(EmployeeFixture | null)[]>;

const READS: [string, Read][] = [
  ['find', (repo, join) => repo.find({ join })],
  ['findOne', async (repo, join) => [await repo.findOne({ join })]],
  [
    'findAndCount',
    async (repo, join) => (await repo.findAndCount({ join }))[0],
  ],
];

async function refusal(call: Promise<unknown>): Promise<unknown> {
  return call.then(
    () => undefined,
    (caught: unknown) => caught,
  );
}

/** The refusal a result carrying `properties` gets. */
async function expectUnasked(
  call: Promise<unknown>,
  properties: string,
): Promise<void> {
  const error = await refusal(call);
  expect(error).toBeInstanceOf(RepositoryQueryException);
  if (error instanceof RepositoryQueryException) {
    expect(error.fault).toBe('internal');
    expect(error.message).toBe(
      'The driver returned Employee properties nothing asked for: ' +
        `${properties}. A result holds its own columns and the relations its ` +
        'read joins',
    );
  }
}

describe('what a result may hold', () => {
  describe.each(READS)('%s', (_name, read) => {
    it('returns a row holding its own columns', async () => {
      const repo = new ResultFixture('employees');
      repo.bind({});
      repo.rows = [{ id: 'e1', name: 'Ada', departmentId: 'd1' }];

      await expect(read(repo)).resolves.toEqual(repo.rows);
    });

    it('refuses a row holding a property that is not a column', async () => {
      const repo = new ResultFixture('employees');
      repo.bind({});
      repo.rows = [{ id: 'e1', nickname: 'Ace' }];

      await expectUnasked(read(repo), 'nickname');
    });

    it('refuses a relation the read did not join', async () => {
      const repo = new ResultFixture('employees');
      repo.bind({});
      repo.rows = [{ id: 'e1', department: { id: 'd1', title: 'R&D' } }];

      await expectUnasked(read(repo), 'department');
    });

    it('returns a joined relation holding its own columns', async () => {
      const repo = new ResultFixture('employees');
      repo.bind({});
      repo.rows = [{ id: 'e1', department: { id: 'd1', title: 'R&D' } }];

      await expect(read(repo, JOIN_DEPARTMENT)).resolves.toEqual(repo.rows);
    });

    it('returns a joined relation that matched nothing', async () => {
      const repo = new ResultFixture('employees');
      repo.bind({});
      repo.rows = [{ id: 'e1', department: null }];

      await expect(read(repo, JOIN_DEPARTMENT)).resolves.toEqual(repo.rows);
    });

    it.each([
      ['left off the row', { id: 'e1' }],
      ['set to undefined', { id: 'e1', department: undefined }],
    ])('refuses a joined relation %s', async (_case, row) => {
      const repo = new ResultFixture('employees');
      repo.bind({});
      repo.rows = [row];

      const error = await refusal(read(repo, JOIN_DEPARTMENT));

      expect(error).toBeInstanceOf(RepositoryQueryException);
      if (error instanceof RepositoryQueryException) {
        expect(error.fault).toBe('internal');
        expect(error.message).toBe(
          'The driver returned Employee rows without relations their read ' +
            'joins: department',
        );
      }
    });

    it('refuses a joined relation holding more than its own columns', async () => {
      const repo = new ResultFixture('employees');
      repo.bind({});
      repo.rows = [
        { id: 'e1', department: { id: 'd1', title: 'R&D', budget: 9 } },
      ];

      await expectUnasked(read(repo, JOIN_DEPARTMENT), 'department.budget');
    });

    it('refuses a joined to-many relation holding more than its own columns', async () => {
      const repo = new ResultFixture('employees');
      repo.bind({});
      repo.rows = [{ id: 'e1', reports: [{ id: 'e2', salary: 1 }] }];

      await expectUnasked(
        read(repo, [{ relation: 'reports' }]),
        'reports.salary',
      );
    });

    it('ignores a property with no value', async () => {
      const repo = new ResultFixture('employees');
      repo.bind({});
      repo.rows = [{ id: 'e1', nickname: undefined }];

      await expect(read(repo)).resolves.toEqual(repo.rows);
    });
  });

  describe('a write result', () => {
    const employee: EmployeeFixture = { id: 'e1', name: 'Ada' };

    it.each([
      ['create', (repo: ResultFixture) => repo.create({ id: 'e1' })],
      ['createMany', (repo: ResultFixture) => repo.createMany([{ id: 'e1' }])],
      [
        'update',
        (repo: ResultFixture) => repo.update(employee, { name: 'Bo' }),
      ],
      ['upsert', (repo: ResultFixture) => repo.upsert({ id: 'e1' })],
      [
        'replace',
        (repo: ResultFixture) => repo.replace(employee, { name: 'Bo' }),
      ],
      ['delete', (repo: ResultFixture) => repo.delete(employee)],
      ['deleteMany', (repo: ResultFixture) => repo.deleteMany([employee])],
      ['softDelete', (repo: ResultFixture) => repo.softDelete(employee)],
      [
        'restore',
        (repo: ResultFixture) =>
          repo.restore({ ...employee, dateDeleted: new Date() }),
      ],
    ])(
      'is refused on %s when it holds more than its columns',
      async (_n, write) => {
        const repo = new ResultFixture('employees');
        repo.bind({});
        repo.writeResult = { id: 'e1', department: { id: 'd1' } };

        await expectUnasked(write(repo), 'department');
      },
    );
  });

  describe('with allowEagerRelations', () => {
    function eagerRepository(): ResultFixture {
      const repo = new ResultFixture('employees');
      repo.bind({ allowEagerRelations: true });
      return repo;
    }

    it('returns a declared relation nobody joined, holding its own columns', async () => {
      const repo = eagerRepository();
      repo.rows = [{ id: 'e1', department: { id: 'd1', title: 'R&D' } }];

      await expect(repo.find()).resolves.toEqual(repo.rows);
    });

    it('refuses an unjoined relation holding more than its own columns', async () => {
      const repo = eagerRepository();
      repo.rows = [
        { id: 'e1', department: { id: 'd1', title: 'R&D', budget: 9 } },
      ];

      await expectUnasked(repo.find(), 'department.budget');
    });

    it('refuses an unjoined relation holding a value that is not a row', async () => {
      const repo = eagerRepository();
      repo.rows = [{ id: 'e1', department: 'd1' }];

      await expectUnasked(repo.find(), 'department');
    });

    it('refuses a relation loaded eagerly inside an unjoined relation', async () => {
      // The nested relation was read by no repository, so nothing scoped or
      // checked it.
      const repo = eagerRepository();
      repo.rows = [
        { id: 'e1', reports: [{ id: 'e2', manager: { id: 'e1' } }] },
      ];

      await expectUnasked(repo.find(), 'reports.manager');
    });

    it('still refuses a property that is not a relation', async () => {
      const repo = eagerRepository();
      repo.rows = [{ id: 'e1', nickname: 'Ace' }];

      await expectUnasked(repo.find(), 'nickname');
    });

    it('still checks a relation the read joined', async () => {
      const repo = eagerRepository();
      repo.rows = [
        { id: 'e1', department: { id: 'd1', title: 'R&D', budget: 9 } },
      ];

      await expectUnasked(
        repo.find({ join: JOIN_DEPARTMENT }),
        'department.budget',
      );
    });

    it('binds once', () => {
      const repo = eagerRepository();

      expect(() => repo.bind({ allowEagerRelations: true })).toThrow(
        RepositoryBootException,
      );
    });
  });
});

describe('what a read may name about a joined relation', () => {
  it('refuses a filter on a field that is not a column of the relation', async () => {
    const repo = new ResultFixture('employees');
    repo.bind({});

    const error = await refusal(
      repo.find({
        join: JOIN_DEPARTMENT,
        where: Where.rel('department', Where.gt('employees', 1)),
      }),
    );

    expect(error).toBeInstanceOf(UnknownColumnException);
    if (error instanceof UnknownColumnException) {
      expect(error.httpStatus).toBe(HttpStatus.BAD_REQUEST);
      expect(error.context.properties).toEqual(['employees']);
    }
    expect(repo.reads).toEqual([]);
  });

  it('refuses a sort on a field that is not a column of the relation', async () => {
    const repo = new ResultFixture('employees');
    repo.bind({});

    const error = await refusal(
      repo.find({
        join: JOIN_DEPARTMENT,
        order: [
          { field: 'employees', order: SortOrder.ASC, relation: 'department' },
        ],
      }),
    );

    expect(error).toBeInstanceOf(UnknownColumnException);
    expect(repo.reads).toEqual([]);
  });

  it('refuses a sort direction that is neither ascending nor descending', async () => {
    const repo = new ResultFixture('employees');
    repo.bind({});
    // Parsed from a request, so any string can arrive.
    const order = JSON.parse('[{ "field": "name", "order": "asc" }]');

    const error = await refusal(repo.find({ order }));

    expect(error).toEqual(
      expect.objectContaining({
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      }),
    );
    expect(repo.reads).toEqual([]);
  });

  it('refuses a filter too complex to translate, whatever the driver', async () => {
    const repo = new ResultFixture('employees');
    repo.bind({});
    const either = (field: string) =>
      Where.or(
        ...Array.from({ length: 8 }, (_, index) =>
          Where.eq(field, `${field}-${index}`),
        ),
      );

    const error = await refusal(
      repo.find({ where: Where.and(either('id'), either('name')) }),
    );

    expect(error).toEqual(
      expect.objectContaining({
        httpStatus: HttpStatus.BAD_REQUEST,
        fault: 'client',
      }),
    );
    expect(repo.reads).toEqual([]);
  });
});
