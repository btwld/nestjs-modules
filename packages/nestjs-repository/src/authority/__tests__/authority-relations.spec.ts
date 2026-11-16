import { Module, type PlainLiteralObject, type Type } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  type Actor,
  type AuthorityDecision,
  CoreModule,
} from '@concepta/nestjs-core';

import {
  actorCtx,
  allow,
  AuthorityFixture,
  type AuthorityTableFixture,
} from '../../__fixtures__/memory/authority.fixture.js';
import {
  INVOICE_LINE_TOKEN,
  INVOICE_TOKEN,
  InvoiceEntityFixture,
  type InvoiceFixture,
  InvoiceLineEntityFixture,
  type InvoiceLineFixture,
  LINE_NOTE_TOKEN,
  LineNoteEntityFixture,
  RECEIPT_TOKEN,
  ReceiptEntityFixture,
  type ReceiptFixture,
} from '../../__fixtures__/memory/cascade.fixture.js';
import {
  AUTHOR_TAG_TOKEN,
  AUTHOR_TOKEN,
  AuthorEntityFixture,
  type AuthorFixture,
  AuthorTagEntityFixture,
  POST_TOKEN,
  PostEntityFixture,
  TAG_TOKEN,
  TagEntityFixture,
} from '../../__fixtures__/memory/federation.fixture.js';
import { MemoryRepositoryFixture } from '../../__fixtures__/memory/memory-repository.fixture.js';
import { MemoryRepositoryModuleFixture } from '../../__fixtures__/memory/memory-repository.module.fixture.js';
import {
  ORDER_LINE_TOKEN,
  ORDER_TOKEN,
  OrderEntityFixture,
  OrderLineEntityFixture,
} from '../../__fixtures__/memory/order.fixture.js';
import {
  EMPLOYEE_METADATA,
  type EmployeeFixture,
} from '../../__fixtures__/relation/employee.fixture.js';
import { RecordingRepositoryFixture } from '../../__fixtures__/relation/recording-repository.fixture.js';
import {
  BeforeCreate,
  BeforeRead,
  RepoHook,
} from '../../hooks/repository-hook.decorators.js';
import { type RepositoryProviderOptions } from '../../interfaces/repository-provider-options.interface.js';
import { type RepositoryColumnMetadataInterface } from '../../repository/interfaces/repository-column-metadata.interface.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import { type RepositoryFindOptions } from '../../repository/interfaces/repository-options.interface.js';
import { type RepositoryAdapter } from '../../repository/repository-adapter.js';
import { SortOrder } from '../../repository/repository.types.js';
import { Where } from '../../repository/where.helpers.js';
import { RepositoryModule } from '../../repository.module.js';
import { getDynamicRepositoryToken } from '../../utils/get-dynamic-repository-token.js';
import { AuthorityBootException } from '../exceptions/authority-boot.exception.js';
import { AuthorityRefusedException } from '../exceptions/authority-refused.exception.js';

const ALL = ['create', 'read', 'update', 'delete', 'softDelete', 'restore'];
const ADMIN: Actor = { kind: 'role', roles: ['admin'] };
const CLERK: Actor = { kind: 'role', roles: ['clerk'] };

const column = (name: string, isPrimary = false) => ({
  name,
  isPrimary,
  isVersion: false,
  isRemoveDate: false,
});

describe('authority over related rows', () => {
  describe('joins', () => {
    const PROJECT_COLUMNS: RepositoryColumnMetadataInterface[] = [
      column('id', true),
      column('title'),
    ];

    /** Employees, with a many-to-many `projects` through assignments. */
    const ROOT_METADATA: RepositoryMetadataInterface<EmployeeFixture> = {
      ...EMPLOYEE_METADATA,
      relations: [
        ...(EMPLOYEE_METADATA.relations ?? []),
        {
          name: 'projects',
          targetEntity: 'Project',
          targetUrn: 'urn:memory:Project',
          targetColumns: PROJECT_COLUMNS,
          cardinality: 'many',
          on: { from: 'id', to: 'id' },
          through: {
            urn: 'urn:memory:Assignment',
            fromKey: 'employeeId',
            toKey: 'projectId',
          },
        },
      ],
    };

    /**
     * Answers every read with `rows`, holding the relations it joins, as a
     * driver that joins would.
     */
    class EmployeesFixture extends RecordingRepositoryFixture {
      override readonly metadata = ROOT_METADATA;
      rows: EmployeeFixture[] = [];
      readonly reads: RepositoryFindOptions<EmployeeFixture>[] = [];

      protected override async doFind(
        options: RepositoryFindOptions<EmployeeFixture> = {},
      ): Promise<EmployeeFixture[]> {
        this.reads.push(options);
        const joined = new Set(
          (options.join ?? []).map(({ relation }) => relation),
        );
        return this.rows.map((row) => {
          const copy: EmployeeFixture = structuredClone(row);
          for (const { name } of ROOT_METADATA.relations ?? []) {
            if (!joined.has(name)) Reflect.deleteProperty(copy, name);
          }
          return copy;
        });
      }
      /** The first row, or the one an `id` equality names. */
      protected override async doFindOne(
        options: RepositoryFindOptions<EmployeeFixture> = {},
      ): Promise<EmployeeFixture | null> {
        const rows = await this.doFind(options);
        const where: unknown = options.where;
        const id =
          typeof where === 'object' &&
          where !== null &&
          Reflect.get(where, 'field') === 'id' &&
          Reflect.get(where, 'operator') === 'eq'
            ? Reflect.get(where, 'value')
            : undefined;
        return rows.find((row) => id === undefined || row.id === id) ?? null;
      }
      protected override async doCount(
        options: RepositoryFindOptions<EmployeeFixture> = {},
      ): Promise<number> {
        this.reads.push(options);
        return this.rows.length;
      }
      protected override async doFindAndCount(
        options: RepositoryFindOptions<EmployeeFixture> = {},
      ): Promise<[EmployeeFixture[], number]> {
        const rows = await this.doFind(options);
        return [rows, rows.length];
      }
    }

    /** A row of an entity only ever decided here. */
    class TargetEntityFixture {
      [key: string]: unknown;
    }

    const target = (key: string, name: string, columns = PROJECT_COLUMNS) =>
      new MemoryRepositoryFixture<PlainLiteralObject>(key, {
        name,
        type: TargetEntityFixture,
        urn: `urn:memory:${name}`,
        columns,
        relations: [],
      });

    function governed(
      adapter: RepositoryAdapter<PlainLiteralObject>,
      authority: AuthorityFixture,
    ) {
      adapter.bind({
        authority: { access: 'governed', authority: AuthorityFixture },
      });
      adapter.setAuthority(authority);
      return adapter;
    }

    const OWN: EmployeeFixture = {
      id: 'emp-1',
      name: 'Ada',
      departmentId: 'dep-1',
      managerId: null,
    };
    const DEPARTMENT = { id: 'dep-1', title: 'Research' };
    const PROJECTS = [{ id: 'proj-1', title: 'Engine' }];
    const EMPLOYEE: EmployeeFixture = {
      ...OWN,
      department: DEPARTMENT,
      projects: PROJECTS,
    };

    function start(
      table: AuthorityTableFixture,
      { rootGoverned = false } = {},
    ) {
      const authority = new AuthorityFixture(table);
      const departments = governed(
        target('departments', 'Department', [
          column('id', true),
          column('title'),
        ]),
        authority,
      );
      const projects = governed(target('projects', 'Project'), authority);
      const assignments = governed(
        target('assignments', 'Assignment', [
          column('id', true),
          column('employeeId'),
          column('projectId'),
        ]),
        authority,
      );

      const employees = new EmployeesFixture('employees');
      employees.bind({
        relationsIntoGoverned: new Map([
          ['department', [departments]],
          ['projects', [projects, assignments]],
        ]),
        ...(rootGoverned
          ? {
              authority: {
                access: 'governed' as const,
                authority: AuthorityFixture,
              },
            }
          : {}),
      });
      if (rootGoverned) employees.setAuthority(authority);
      employees.rows = [EMPLOYEE];
      return { authority, employees };
    }

    const readsAll = (key: string): AuthorityTableFixture =>
      allow('role:clerk', key, ['read']);

    const readsOnly = (
      key: string,
      columns: string[],
    ): AuthorityTableFixture => {
      const decision: AuthorityDecision = { effect: 'allow', columns };
      return { [`role:clerk ${key} read`]: decision };
    };

    it('should read an ungoverned root without deciding anything', async () => {
      const { authority, employees } = start({});

      await expect(employees.find({})).resolves.toHaveLength(1);
      expect(authority.requests).toEqual([]);
    });

    it('should refuse a join into rows the actor may not read', async () => {
      const { employees } = start({});

      await expect(
        employees.find({
          join: [{ relation: 'department' }],
          ctx: actorCtx(CLERK),
        }),
      ).rejects.toThrow(AuthorityRefusedException);
      expect(employees.reads).toEqual([]);
    });

    it('should refuse a join into governed rows when the call has no actor', async () => {
      const { employees } = start(readsAll('departments'));

      await expect(
        employees.find({ join: [{ relation: 'department' }] }),
      ).rejects.toThrow(AuthorityRefusedException);
    });

    it('should join rows the actor may read', async () => {
      const { employees } = start(readsAll('departments'));

      await expect(
        employees.find({
          join: [{ relation: 'department' }],
          ctx: actorCtx(CLERK),
        }),
      ).resolves.toEqual([{ ...OWN, department: DEPARTMENT }]);
    });

    it('should hold only the readable columns of joined rows', async () => {
      const { employees } = start(readsOnly('departments', ['id']));

      await expect(
        employees.find({
          join: [{ relation: 'department' }],
          ctx: actorCtx(CLERK),
        }),
      ).resolves.toEqual([{ ...OWN, department: { id: 'dep-1' } }]);
    });

    it('should leave a missing joined row missing while narrowing the others', async () => {
      const { employees } = start(readsOnly('departments', ['id']));
      employees.rows = [EMPLOYEE, { ...OWN, id: 'emp-2', department: null }];

      await expect(
        employees.find({
          join: [{ relation: 'department' }],
          ctx: actorCtx(CLERK),
        }),
      ).resolves.toEqual([
        { ...OWN, department: { id: 'dep-1' } },
        { ...OWN, id: 'emp-2', department: null },
      ]);
    });

    it('should find no row through a narrowed join', async () => {
      const { employees } = start(readsOnly('departments', ['id']));
      const read = (id: string) =>
        employees.findOne({
          where: Where.eq('id', id),
          join: [{ relation: 'department' }],
          ctx: actorCtx(CLERK),
        });

      await expect(read('emp-9')).resolves.toBeNull();
      // The same read finds the row that is there, narrowed.
      await expect(read(EMPLOYEE.id)).resolves.toEqual({
        ...OWN,
        department: { id: 'dep-1' },
      });
    });

    it.each([
      {
        name: 'filter',
        options: { where: Where.rel('department', Where.eq('title', 'R')) },
      },
      {
        name: 'sort',
        options: {
          order: [
            { relation: 'department', field: 'title', order: SortOrder.ASC },
          ],
        },
      },
    ])(
      'should refuse a $name on a joined column the actor may not read',
      async ({ options }) => {
        const { employees } = start(readsOnly('departments', ['id']));

        const error = await employees
          .find({
            ...options,
            join: [{ relation: 'department' }],
            ctx: actorCtx(CLERK),
          })
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AuthorityRefusedException);
        expect(error).toMatchObject({
          context: { columns: ['department.title'] },
        });
        expect(employees.reads).toEqual([]);
      },
    );

    it('should decide a join counted on, too', async () => {
      const { employees } = start({});

      await expect(
        employees.count({
          join: [{ relation: 'department' }],
          ctx: actorCtx(CLERK),
        }),
      ).rejects.toThrow(AuthorityRefusedException);
    });

    it('should decide the junction of a many-to-many join', async () => {
      const { employees } = start(readsAll('projects'));

      await expect(
        employees.find({
          join: [{ relation: 'projects' }],
          ctx: actorCtx(CLERK),
        }),
      ).rejects.toThrow(AuthorityRefusedException);
    });

    // Generated CRUD lists with findAndCount and reads with findOne, so each
    // read decides its joins as find does.
    // The reads `find` and `count` are decided as above; these are the
    // others, which generated CRUD Read and List go through.
    describe('on every other read', () => {
      type Read = (
        employees: EmployeesFixture,
        options: RepositoryFindOptions<EmployeeFixture>,
      ) => Promise<unknown>;
      const findOne: Read = (e, o) => e.findOne(o);
      const findAndCount: Read = (e, o) => e.findAndCount(o);
      const count: Read = (e, o) => e.count(o);
      const NARROWED = { ...OWN, department: { id: 'dep-1' } };

      it.each([
        { name: 'findOne', read: findOne, rows: NARROWED },
        { name: 'findAndCount', read: findAndCount, rows: [[NARROWED], 1] },
      ])(
        'should hold only the readable columns of joined rows on $name',
        async ({ read, rows }) => {
          const { employees } = start(readsOnly('departments', ['id']));

          await expect(
            read(employees, {
              join: [{ relation: 'department' }],
              ctx: actorCtx(CLERK),
            }),
          ).resolves.toEqual(rows);
        },
      );

      it.each([
        { name: 'findOne', read: findOne },
        { name: 'findAndCount', read: findAndCount },
      ])(
        'should refuse a join into rows the actor may not read on $name',
        async ({ read }) => {
          const { employees } = start({});

          await expect(
            read(employees, {
              join: [{ relation: 'department' }],
              ctx: actorCtx(CLERK),
            }),
          ).rejects.toThrow(AuthorityRefusedException);
          expect(employees.reads).toEqual([]);
        },
      );

      it.each([
        { name: 'findOne', read: findOne },
        { name: 'findAndCount', read: findAndCount },
        { name: 'count', read: count },
      ])(
        'should refuse a filter on a joined column the actor may not read on $name',
        async ({ read }) => {
          const { employees } = start(readsOnly('departments', ['id']));

          await expect(
            read(employees, {
              where: Where.rel('department', Where.eq('title', 'R')),
              join: [{ relation: 'department' }],
              ctx: actorCtx(CLERK),
            }),
          ).rejects.toThrow(AuthorityRefusedException);
          expect(employees.reads).toEqual([]);
        },
      );
    });

    describe('a relation matched by a root column the actor may not read', () => {
      const HIDDEN_KEY = {
        ...readsOnly('employees', ['id', 'name', 'managerId']),
        ...readsAll('departments'),
      };
      type Read = (
        employees: EmployeesFixture,
        options: RepositoryFindOptions<EmployeeFixture>,
      ) => Promise<unknown>;
      const reads: { name: string; read: Read }[] = [
        { name: 'find', read: (e, o) => e.find(o) },
        { name: 'findOne', read: (e, o) => e.findOne(o) },
        { name: 'findAndCount', read: (e, o) => e.findAndCount(o) },
        { name: 'count', read: (e, o) => e.count(o) },
      ];

      it.each(reads)(
        'should refuse joining it on $name, since the join holds the column',
        async ({ read }) => {
          const { employees } = start(HIDDEN_KEY, { rootGoverned: true });

          await expect(
            read(employees, {
              join: [{ relation: 'department' }],
              ctx: actorCtx(CLERK),
            }),
          ).rejects.toThrow(AuthorityRefusedException);
          expect(employees.reads).toEqual([]);
        },
      );

      it.each(reads)(
        'should refuse filtering by it on $name, since the filter matches the column',
        async ({ read }) => {
          const { employees } = start(HIDDEN_KEY, { rootGoverned: true });

          await expect(
            read(employees, {
              where: Where.rel('department', Where.eq('id', 'dep-1')),
              join: [{ relation: 'department' }],
              ctx: actorCtx(CLERK),
            }),
          ).rejects.toThrow(AuthorityRefusedException);
          expect(employees.reads).toEqual([]);
        },
      );

      it('should join it once the actor may read the column', async () => {
        const { employees } = start(
          {
            ...readsOnly('employees', [
              'id',
              'name',
              'managerId',
              'departmentId',
            ]),
            ...readsAll('departments'),
          },
          { rootGoverned: true },
        );

        await expect(
          employees.find({
            join: [{ relation: 'department' }],
            ctx: actorCtx(CLERK),
          }),
        ).resolves.toEqual([{ ...OWN, department: DEPARTMENT }]);
      });
    });

    it('should join a many-to-many when target and junction are readable', async () => {
      const { employees } = start({
        ...readsOnly('projects', ['title']),
        ...readsAll('assignments'),
      });

      await expect(
        employees.find({
          join: [{ relation: 'projects' }],
          ctx: actorCtx(CLERK),
        }),
      ).resolves.toEqual([{ ...OWN, projects: [{ title: 'Engine' }] }]);
    });
  });

  describe('eager relations', () => {
    it('should refuse at startup an eager entity with a relation into governed rows', async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            CoreModule.forRoot({}),
            RepositoryModule.forRoot({
              imports: [deciders(new AuthorityFixture())],
              adapters: [
                {
                  adapter: MemoryRepositoryModuleFixture,
                  entities: [
                    {
                      key: ORDER_TOKEN,
                      entity: OrderEntityFixture,
                      authority: {
                        access: 'governed',
                        authority: AuthorityFixture,
                      },
                    },
                    {
                      key: ORDER_LINE_TOKEN,
                      entity: OrderLineEntityFixture,
                      allowEagerRelations: true,
                    },
                  ],
                },
              ],
            }),
          ],
        }).compile(),
      ).rejects.toThrow(AuthorityBootException);
    });
  });

  // A hook can reshape the read, but never who it is decided for.
  describe('a hook handing the read another actor', () => {
    const opened: TestingModule[] = [];
    afterEach(async () => {
      await Promise.all(opened.splice(0).map((m) => m.close()));
    });

    async function compileLines(table: AuthorityTableFixture) {
      const moduleRef = await Test.createTestingModule({
        imports: [
          CoreModule.forRoot({}),
          RepositoryModule.forRoot({
            imports: [
              deciders(new AuthorityFixture(table), [ReadsAsAdminHook]),
            ],
            adapters: [
              {
                adapter: MemoryRepositoryModuleFixture,
                entities: [
                  {
                    key: ORDER_TOKEN,
                    entity: OrderEntityFixture,
                    authority: {
                      access: 'governed',
                      authority: AuthorityFixture,
                    },
                  },
                  {
                    key: ORDER_LINE_TOKEN,
                    entity: OrderLineEntityFixture,
                    authority: {
                      access: 'governed',
                      authority: AuthorityFixture,
                    },
                    hooks: [ReadsAsAdminHook],
                  },
                ],
              },
            ],
          }),
        ],
      }).compile();
      opened.push(moduleRef);
      await moduleRef.init();
      return moduleRef.get<MemoryRepositoryFixture<PlainLiteralObject>>(
        getDynamicRepositoryToken(ORDER_LINE_TOKEN),
      );
    }

    const ADMIN_READS = {
      ...allow('role:admin', ORDER_TOKEN, ['read']),
      ...allow('role:admin', ORDER_LINE_TOKEN, ['read']),
    };

    type Read = (
      lines: MemoryRepositoryFixture<PlainLiteralObject>,
      options: RepositoryFindOptions<PlainLiteralObject>,
    ) => Promise<unknown>;
    const READS: { name: string; read: Read }[] = [
      { name: 'find', read: (l, o) => l.find(o) },
      { name: 'findOne', read: (l, o) => l.findOne(o) },
      { name: 'findAndCount', read: (l, o) => l.findAndCount(o) },
      { name: 'count', read: (l, o) => l.count(o) },
    ];

    it.each(READS)(
      'should decide the root as the caller on $name',
      async ({ read }) => {
        const lines = await compileLines(ADMIN_READS);

        await expect(read(lines, { ctx: actorCtx(CLERK) })).rejects.toThrow(
          AuthorityRefusedException,
        );
      },
    );

    it.each(READS)(
      'should decide a join as the caller on $name',
      async ({ read }) => {
        const lines = await compileLines({
          ...ADMIN_READS,
          ...allow('role:clerk', ORDER_LINE_TOKEN, ['read']),
        });

        await expect(
          read(lines, {
            join: [{ relation: 'order' }],
            ctx: actorCtx(CLERK),
          }),
        ).rejects.toThrow(AuthorityRefusedException);
      },
    );
  });

  // Authors and tags are open; only the junction between them is governed.
  describe('a junction an authority governs', () => {
    async function compileAuthors(eager: boolean) {
      return Test.createTestingModule({
        imports: [
          CoreModule.forRoot({}),
          RepositoryModule.forRoot({
            imports: [deciders(new AuthorityFixture())],
            adapters: [
              {
                adapter: MemoryRepositoryModuleFixture,
                entities: [
                  {
                    key: AUTHOR_TOKEN,
                    entity: AuthorEntityFixture,
                    ...(eager ? { allowEagerRelations: true } : {}),
                  },
                  { key: TAG_TOKEN, entity: TagEntityFixture },
                  {
                    key: AUTHOR_TAG_TOKEN,
                    entity: AuthorTagEntityFixture,
                    authority: {
                      access: 'governed',
                      authority: AuthorityFixture,
                    },
                  },
                ],
              },
            ],
          }),
        ],
      }).compile();
    }

    it('should decide a many-to-many join through it', async () => {
      const moduleRef = await compileAuthors(false);
      try {
        await moduleRef.init();
        const authors = moduleRef.get<MemoryRepositoryFixture<AuthorFixture>>(
          getDynamicRepositoryToken(AUTHOR_TOKEN),
        );

        await expect(
          authors.find({ join: [{ relation: 'tags' }], ctx: actorCtx(CLERK) }),
        ).rejects.toThrow(AuthorityRefusedException);
      } finally {
        await moduleRef.close();
      }
    });

    it('should refuse at startup an eager entity with a relation through it', async () => {
      const compiled = compileAuthors(true);

      await expect(compiled).rejects.toThrow(AuthorityBootException);
      await expect(compiled).rejects.toThrow(
        `"${AUTHOR_TOKEN}" allows eager relations, but "tags" reach rows an authority governs`,
      );
    });
  });

  describe('cascade', () => {
    const GOVERNED = {
      access: 'governed',
      authority: AuthorityFixture,
    } as const;

    const ENTITIES: RepositoryProviderOptions[] = [
      {
        key: INVOICE_TOKEN,
        entity: InvoiceEntityFixture,
        authority: GOVERNED,
        relations: { lines: { cascade: true }, receipt: { cascade: true } },
      },
      {
        key: INVOICE_LINE_TOKEN,
        entity: InvoiceLineEntityFixture,
        authority: GOVERNED,
      },
      { key: RECEIPT_TOKEN, entity: ReceiptEntityFixture, authority: GOVERNED },
    ];

    const INVOICE: InvoiceFixture = {
      id: 'inv-1',
      tenantId: 'acme',
      number: '1',
      dateDeleted: null,
    };
    const LINE: InvoiceLineFixture = {
      id: 'line-1',
      tenantId: 'acme',
      invoiceId: INVOICE.id,
      sku: 'a',
      dateDeleted: null,
    };
    const RECEIPT: ReceiptFixture = {
      id: 'rec-1',
      tenantId: 'acme',
      invoiceId: INVOICE.id,
      total: 10,
      dateDeleted: null,
    };

    async function start(table: AuthorityTableFixture, lineHooks: Type[] = []) {
      const authority = new AuthorityFixture({
        ...allow('role:admin', INVOICE_TOKEN, ALL),
        ...allow('role:admin', INVOICE_LINE_TOKEN, ALL),
        ...allow('role:admin', RECEIPT_TOKEN, ALL),
        ...table,
      });
      const entities = ENTITIES.map((entity) =>
        entity.key === INVOICE_LINE_TOKEN && lineHooks.length > 0
          ? { ...entity, hooks: lineHooks }
          : entity,
      );
      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [
          CoreModule.forRoot({}),
          RepositoryModule.forRoot({
            imports: [deciders(authority, lineHooks)],
            adapters: [{ adapter: MemoryRepositoryModuleFixture, entities }],
          }),
        ],
      }).compile();
      const repo = <T extends PlainLiteralObject>(key: string) =>
        moduleRef.get<MemoryRepositoryFixture<T>>(
          getDynamicRepositoryToken(key),
        );
      return {
        authority,
        invoices: repo<InvoiceFixture>(INVOICE_TOKEN),
        lines: repo<InvoiceLineFixture>(INVOICE_LINE_TOKEN),
        receipts: repo<ReceiptFixture>(RECEIPT_TOKEN),
      };
    }

    async function seeded(table: AuthorityTableFixture) {
      const repos = await start(table);
      await repos.invoices.create(
        { ...INVOICE, lines: [LINE], receipt: RECEIPT },
        { ctx: actorCtx(ADMIN) },
      );
      return repos;
    }

    it('should create nothing when a related entity refuses the create', async () => {
      const { invoices, lines } = await start(
        allow('role:clerk', INVOICE_TOKEN, ['create']),
      );

      await expect(
        invoices.create(
          { ...INVOICE, lines: [LINE] },
          { ctx: actorCtx(CLERK) },
        ),
      ).rejects.toThrow(AuthorityRefusedException);
      expect(invoices.stored).toEqual([]);
      expect(lines.stored).toEqual([]);
    });

    it('should create related rows the actor may create', async () => {
      const { invoices, lines } = await start({
        ...allow('role:clerk', INVOICE_TOKEN, ['create']),
        ...allow('role:clerk', INVOICE_LINE_TOKEN, ['create']),
      });

      await invoices.create(
        { ...INVOICE, lines: [LINE] },
        { ctx: actorCtx(CLERK) },
      );

      expect(invoices.stored).toEqual([INVOICE]);
      expect(lines.stored).toEqual([LINE]);
    });

    it('should update nothing when a related entity refuses what the update could do', async () => {
      const { invoices, lines } = await seeded({
        ...allow('role:clerk', INVOICE_TOKEN, ['update']),
        ...allow('role:clerk', INVOICE_LINE_TOKEN, ['update']),
      });

      await expect(
        invoices.update(
          INVOICE,
          { number: '2', lines: [{ ...LINE, sku: 'b' }] },
          { ctx: actorCtx(CLERK) },
        ),
      ).rejects.toThrow(AuthorityRefusedException);
      expect(invoices.stored).toEqual([INVOICE]);
      expect(lines.stored).toEqual([LINE]);
    });

    // A to-one row named without its key is the stored row when there is
    // one, so it is decided as an update too, before the parent is written.
    it('should update nothing when a to-one row named without its key could be updated and the update is refused', async () => {
      const notTotal: AuthorityDecision = {
        effect: 'allow',
        columns: ['tenantId', 'invoiceId', 'dateDeleted'],
      };
      const { invoices, receipts } = await seeded({
        ...allow('role:clerk', INVOICE_TOKEN, ['update']),
        ...allow('role:clerk', RECEIPT_TOKEN, ['create']),
        [`role:clerk ${RECEIPT_TOKEN} update`]: notTotal,
      });

      await expect(
        invoices.update(
          INVOICE,
          { number: '2', receipt: { total: 20 } },
          { ctx: actorCtx(CLERK) },
        ),
      ).rejects.toThrow(AuthorityRefusedException);
      expect(invoices.stored).toEqual([INVOICE]);
      expect(receipts.stored).toEqual([RECEIPT]);
    });

    it('should create no row of a batch when a related entity refuses any row’s related rows', async () => {
      const { invoices, lines } = await start(
        allow('role:clerk', INVOICE_TOKEN, ['create']),
      );
      const second = { ...INVOICE, id: 'inv-2', number: '2' };

      await expect(
        invoices.createMany(
          [INVOICE, { ...second, lines: [{ ...LINE, id: 'line-2' }] }],
          { ctx: actorCtx(CLERK) },
        ),
      ).rejects.toThrow(AuthorityRefusedException);
      expect(invoices.stored).toEqual([]);
      expect(lines.stored).toEqual([]);
    });

    // Decided up front, by the write and by its reach, and again by the
    // delete itself, which is the caller's: nothing marks it as the
    // repository's own call.
    it('should decide the delete of a related row a replace leaves out when it deletes it', async () => {
      const { authority, invoices, lines } = await seeded({
        ...allow('role:clerk', INVOICE_TOKEN, ALL),
        ...allow('role:clerk', INVOICE_LINE_TOKEN, [
          'create',
          'update',
          'delete',
        ]),
      });
      // Each line delete asked, with whether the invoice was written yet.
      const asked: { actor: unknown; afterWrite: boolean }[] = [];
      const decide = authority.decide.bind(authority);
      vi.spyOn(authority, 'decide').mockImplementation((ctx, request) => {
        if (
          request.subject === INVOICE_LINE_TOKEN &&
          request.action === 'delete'
        ) {
          asked.push({
            actor: request.actor,
            afterWrite: invoices.stored.some(({ number }) => number === '2'),
          });
        }
        return decide(ctx, request);
      });

      await invoices.replace(
        INVOICE,
        { ...INVOICE, number: '2', lines: [] },
        { ctx: actorCtx(CLERK) },
      );

      expect(lines.stored).toEqual([]);
      expect(asked.map(({ actor }) => actor)).toEqual(asked.map(() => CLERK));
      expect(asked.filter(({ afterWrite }) => afterWrite)).toEqual([
        { actor: CLERK, afterWrite: true },
      ]);
    });

    it('should update related rows without reading them', async () => {
      const { invoices, lines } = await seeded({
        ...allow('role:clerk', INVOICE_TOKEN, ['update']),
        ...allow('role:clerk', INVOICE_LINE_TOKEN, ['update', 'create']),
      });

      await invoices.update(
        INVOICE,
        { number: '2', lines: [{ ...LINE, sku: 'b' }] },
        { ctx: actorCtx(CLERK) },
      );

      expect(lines.stored).toEqual([{ ...LINE, sku: 'b' }]);
    });

    describe('a to-one related row a write names', () => {
      const CLERK_TABLE = {
        ...allow('role:clerk', INVOICE_TOKEN, ALL),
        ...allow('role:clerk', RECEIPT_TOKEN, ['read', 'create', 'update']),
      };

      it('should replace without the delete it can never take', async () => {
        const { invoices, receipts } = await seeded(CLERK_TABLE);

        await invoices.replace(
          INVOICE,
          { ...INVOICE, number: '2', receipt: { ...RECEIPT, total: 20 } },
          { ctx: actorCtx(CLERK) },
        );

        expect(invoices.stored).toEqual([{ ...INVOICE, number: '2' }]);
        expect(receipts.stored).toEqual([{ ...RECEIPT, total: 20 }]);
      });

      it('should upsert without the delete it can never take', async () => {
        const { invoices, receipts } = await start(CLERK_TABLE);

        await invoices.upsert(
          { ...INVOICE, receipt: RECEIPT },
          { ctx: actorCtx(CLERK) },
        );

        expect(invoices.stored).toEqual([INVOICE]);
        expect(receipts.stored).toEqual([RECEIPT]);
      });

      it('should refuse setting it to null without the delete, before writing', async () => {
        const { invoices, receipts } = await seeded(CLERK_TABLE);

        const error = await invoices
          .update(
            INVOICE,
            { number: '2', receipt: null },
            { ctx: actorCtx(CLERK) },
          )
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AuthorityRefusedException);
        expect(error).toMatchObject({
          context: { entityKey: RECEIPT_TOKEN, action: 'delete' },
        });
        expect(invoices.stored).toEqual([INVOICE]);
        expect(receipts.stored).toEqual([RECEIPT]);
      });
    });

    it('should delete no related row when any related entity refuses', async () => {
      const { invoices, lines, receipts } = await seeded({
        ...allow('role:clerk', INVOICE_TOKEN, ['delete']),
        ...allow('role:clerk', INVOICE_LINE_TOKEN, ['delete']),
      });

      await expect(
        invoices.delete(INVOICE, { ctx: actorCtx(CLERK) }),
      ).rejects.toThrow(AuthorityRefusedException);
      expect(invoices.stored).toEqual([INVOICE]);
      expect(lines.stored).toEqual([LINE]);
      expect(receipts.stored).toEqual([RECEIPT]);
    });

    it('should delete related rows without reading them', async () => {
      const { invoices, lines, receipts } = await seeded({
        ...allow('role:clerk', INVOICE_TOKEN, ['delete']),
        ...allow('role:clerk', INVOICE_LINE_TOKEN, ['delete']),
        ...allow('role:clerk', RECEIPT_TOKEN, ['delete']),
      });

      await invoices.delete(INVOICE, { ctx: actorCtx(CLERK) });

      expect(invoices.stored).toEqual([]);
      expect(lines.stored).toEqual([]);
      expect(receipts.stored).toEqual([]);
    });

    it('should soft delete no related row unless the actor may soft delete it, whatever they may delete', async () => {
      const { invoices, lines, receipts } = await seeded({
        ...allow('role:clerk', INVOICE_TOKEN, ['softDelete']),
        ...allow('role:clerk', INVOICE_LINE_TOKEN, ['softDelete', 'delete']),
        ...allow('role:clerk', RECEIPT_TOKEN, ['delete']),
      });

      await expect(
        invoices.softDelete(INVOICE, { ctx: actorCtx(CLERK) }),
      ).rejects.toThrow(AuthorityRefusedException);
      expect(invoices.stored).toEqual([INVOICE]);
      expect(lines.stored).toEqual([LINE]);
      expect(receipts.stored).toEqual([RECEIPT]);
    });

    it('should restore related rows as restores, not updates', async () => {
      const { invoices, lines, receipts } = await seeded({
        ...allow('role:clerk', INVOICE_TOKEN, ['restore']),
        ...allow('role:clerk', INVOICE_LINE_TOKEN, ['restore']),
        ...allow('role:clerk', RECEIPT_TOKEN, ['restore']),
      });
      await invoices.softDelete(INVOICE, { ctx: actorCtx(ADMIN) });

      await invoices.restore(
        { ...INVOICE, dateDeleted: invoices.stored[0]?.dateDeleted ?? null },
        { ctx: actorCtx(CLERK) },
      );

      expect(invoices.stored).toEqual([INVOICE]);
      expect(lines.stored).toEqual([LINE]);
      expect(receipts.stored).toEqual([RECEIPT]);
    });

    describe('a parent without related rows', () => {
      async function refusedBy(promise: Promise<unknown>): Promise<unknown> {
        const error = await promise.catch((e: unknown) => e);
        expect(error).toBeInstanceOf(AuthorityRefusedException);
        return error instanceof AuthorityRefusedException
          ? error.context.entityKey
          : undefined;
      }

      it('should delete nothing when a related entity refuses the delete', async () => {
        const { invoices, lines, receipts } = await start({
          ...allow('role:clerk', INVOICE_TOKEN, ['delete']),
          ...allow('role:clerk', RECEIPT_TOKEN, ['delete']),
        });
        await invoices.create(INVOICE, { ctx: actorCtx(ADMIN) });

        await expect(
          refusedBy(invoices.delete(INVOICE, { ctx: actorCtx(CLERK) })),
        ).resolves.toEqual(INVOICE_LINE_TOKEN);
        expect(invoices.stored).toEqual([INVOICE]);
        expect(lines.stored).toEqual([]);
        expect(receipts.stored).toEqual([]);
      });

      it('should delete nothing of a batch when a related entity refuses the delete', async () => {
        const { invoices } = await start({
          ...allow('role:clerk', INVOICE_TOKEN, ['delete']),
          ...allow('role:clerk', RECEIPT_TOKEN, ['delete']),
        });
        const OTHER: InvoiceFixture = { ...INVOICE, id: 'inv-2', number: '2' };
        await invoices.create(INVOICE, { ctx: actorCtx(ADMIN) });
        await invoices.create(OTHER, { ctx: actorCtx(ADMIN) });

        await expect(
          refusedBy(
            invoices.deleteMany([INVOICE, OTHER], { ctx: actorCtx(CLERK) }),
          ),
        ).resolves.toEqual(INVOICE_LINE_TOKEN);
        expect(invoices.stored).toEqual([INVOICE, OTHER]);
      });

      it('should refuse a batch holding a row never stored as it refuses a stored one', async () => {
        const { invoices } = await start({
          ...allow('role:clerk', INVOICE_TOKEN, ['delete']),
          ...allow('role:clerk', RECEIPT_TOKEN, ['delete']),
        });
        const MISSING: InvoiceFixture = {
          ...INVOICE,
          id: 'inv-9',
          number: '9',
        };
        await invoices.create(INVOICE, { ctx: actorCtx(ADMIN) });

        await expect(
          refusedBy(
            invoices.deleteMany([INVOICE, MISSING], { ctx: actorCtx(CLERK) }),
          ),
        ).resolves.toEqual(INVOICE_LINE_TOKEN);
        expect(invoices.stored).toEqual([INVOICE]);
      });

      it('should soft delete nothing when a related entity refuses the soft delete', async () => {
        const { invoices, lines, receipts } = await start({
          ...allow('role:clerk', INVOICE_TOKEN, ['softDelete']),
          ...allow('role:clerk', RECEIPT_TOKEN, ['softDelete']),
        });
        await invoices.create(INVOICE, { ctx: actorCtx(ADMIN) });

        await expect(
          refusedBy(invoices.softDelete(INVOICE, { ctx: actorCtx(CLERK) })),
        ).resolves.toEqual(INVOICE_LINE_TOKEN);
        expect(invoices.stored).toEqual([INVOICE]);
        expect(lines.stored).toEqual([]);
        expect(receipts.stored).toEqual([]);
      });

      it('should restore nothing when a related entity refuses the restore', async () => {
        const { invoices, lines, receipts } = await start({
          ...allow('role:clerk', INVOICE_TOKEN, ['restore']),
          ...allow('role:clerk', RECEIPT_TOKEN, ['restore']),
        });
        await invoices.create(INVOICE, { ctx: actorCtx(ADMIN) });
        const deleted = await invoices.softDelete(INVOICE, {
          ctx: actorCtx(ADMIN),
        });

        await expect(
          refusedBy(invoices.restore(deleted, { ctx: actorCtx(CLERK) })),
        ).resolves.toEqual(INVOICE_LINE_TOKEN);
        expect(invoices.stored).toEqual([deleted]);
        expect(lines.stored).toEqual([]);
        expect(receipts.stored).toEqual([]);
      });

      it('should delete a parent without related rows when the actor may delete every related entity', async () => {
        const { invoices } = await start({
          ...allow('role:clerk', INVOICE_TOKEN, ['delete']),
          ...allow('role:clerk', INVOICE_LINE_TOKEN, ['delete']),
          ...allow('role:clerk', RECEIPT_TOKEN, ['delete']),
        });
        await invoices.create(INVOICE, { ctx: actorCtx(ADMIN) });

        await expect(
          invoices.delete(INVOICE, { ctx: actorCtx(CLERK) }),
        ).resolves.toEqual({ id: INVOICE.id });
        expect(invoices.stored).toEqual([]);
      });
    });

    describe('related entities further down', () => {
      async function deep(table: AuthorityTableFixture) {
        const authority = new AuthorityFixture({
          ...allow('role:admin', INVOICE_TOKEN, ALL),
          ...allow('role:admin', INVOICE_LINE_TOKEN, ALL),
          ...allow('role:admin', LINE_NOTE_TOKEN, ALL),
          ...table,
        });
        const moduleRef: TestingModule = await Test.createTestingModule({
          imports: [
            CoreModule.forRoot({}),
            RepositoryModule.forRoot({
              imports: [deciders(authority)],
              adapters: [
                {
                  adapter: MemoryRepositoryModuleFixture,
                  entities: [
                    {
                      key: INVOICE_TOKEN,
                      entity: InvoiceEntityFixture,
                      authority: GOVERNED,
                      relations: { lines: { cascade: true } },
                    },
                    {
                      key: INVOICE_LINE_TOKEN,
                      entity: InvoiceLineEntityFixture,
                      authority: GOVERNED,
                      relations: { notes: { cascade: true } },
                    },
                    {
                      key: LINE_NOTE_TOKEN,
                      entity: LineNoteEntityFixture,
                      authority: GOVERNED,
                    },
                  ],
                },
              ],
            }),
          ],
        }).compile();
        return {
          invoices: moduleRef.get<MemoryRepositoryFixture<InvoiceFixture>>(
            getDynamicRepositoryToken(INVOICE_TOKEN),
          ),
          lines: moduleRef.get<MemoryRepositoryFixture<InvoiceLineFixture>>(
            getDynamicRepositoryToken(INVOICE_LINE_TOKEN),
          ),
        };
      }

      it('should refuse a delete an entity two cascades down refuses, with nothing stored between', async () => {
        const { invoices } = await deep({
          ...allow('role:clerk', INVOICE_TOKEN, ['delete']),
          ...allow('role:clerk', INVOICE_LINE_TOKEN, ['delete']),
        });
        await invoices.create(INVOICE, { ctx: actorCtx(ADMIN) });

        const error = await invoices
          .delete(INVOICE, { ctx: actorCtx(CLERK) })
          .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(AuthorityRefusedException);
        expect(error).toMatchObject({
          context: { entityKey: LINE_NOTE_TOKEN },
        });
        expect(invoices.stored).toEqual([INVOICE]);
      });

      it('should delete through every cascade level the actor may delete', async () => {
        const { invoices } = await deep({
          ...allow('role:clerk', INVOICE_TOKEN, ['delete']),
          ...allow('role:clerk', INVOICE_LINE_TOKEN, ['delete']),
          ...allow('role:clerk', LINE_NOTE_TOKEN, ['delete']),
        });
        await invoices.create(
          { ...INVOICE, lines: [LINE] },
          { ctx: actorCtx(ADMIN) },
        );

        await expect(
          invoices.delete(INVOICE, { ctx: actorCtx(CLERK) }),
        ).resolves.toEqual({ id: INVOICE.id });
        expect(invoices.stored).toEqual([]);
      });

      it.each([
        ['with the related row stored', true],
        ['with nothing stored to delete', false],
      ])(
        'should refuse a replace that could delete through a refused entity before writing, %s',
        async (_name, stored) => {
          const { invoices, lines } = await deep({
            ...allow('role:clerk', INVOICE_TOKEN, ALL),
            ...allow('role:clerk', INVOICE_LINE_TOKEN, ALL),
          });
          await invoices.create(
            stored ? { ...INVOICE, lines: [LINE] } : INVOICE,
            { ctx: actorCtx(ADMIN) },
          );

          const error = await invoices
            .replace(
              INVOICE,
              { ...INVOICE, number: '2', lines: [] },
              { ctx: actorCtx(CLERK) },
            )
            .catch((e: unknown) => e);
          expect(error).toBeInstanceOf(AuthorityRefusedException);
          expect(error).toMatchObject({
            context: { entityKey: LINE_NOTE_TOKEN },
          });
          expect(invoices.stored).toEqual([INVOICE]);
          expect(lines.stored).toEqual(stored ? [LINE] : []);
        },
      );
    });

    it('should delete no row of a batch when a related entity refuses any of its rows', async () => {
      const { invoices, lines, receipts } = await start({
        ...allow('role:clerk', INVOICE_TOKEN, ['delete']),
        ...allow('role:clerk', INVOICE_LINE_TOKEN, ['delete']),
      });
      const OTHER: InvoiceFixture = { ...INVOICE, id: 'inv-2', number: '2' };
      await invoices.create(
        { ...INVOICE, lines: [LINE] },
        { ctx: actorCtx(ADMIN) },
      );
      await invoices.create(
        { ...OTHER, receipt: { ...RECEIPT, invoiceId: OTHER.id } },
        { ctx: actorCtx(ADMIN) },
      );

      await expect(
        invoices.deleteMany([INVOICE, OTHER], { ctx: actorCtx(CLERK) }),
      ).rejects.toThrow(AuthorityRefusedException);
      expect(invoices.stored).toEqual([INVOICE, OTHER]);
      expect(lines.stored).toEqual([LINE]);
      expect(receipts.stored).toEqual([{ ...RECEIPT, invoiceId: OTHER.id }]);
    });

    describe('the columns of related rows', () => {
      const WITHOUT_SKU: AuthorityDecision = {
        effect: 'allow',
        columns: ['tenantId', 'dateDeleted'],
      };

      it('should create nothing when a related row writes a column the actor may not create', async () => {
        const { invoices, lines } = await start({
          ...allow('role:clerk', INVOICE_TOKEN, ['create']),
          [`role:clerk ${INVOICE_LINE_TOKEN} create`]: WITHOUT_SKU,
        });

        const error = await invoices
          .create({ ...INVOICE, lines: [LINE] }, { ctx: actorCtx(CLERK) })
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AuthorityRefusedException);
        expect(error).toMatchObject({ context: { columns: ['sku'] } });
        expect(invoices.stored).toEqual([]);
        expect(lines.stored).toEqual([]);
      });

      it('should update nothing when a related row writes a column the actor may not update', async () => {
        const { invoices, lines } = await seeded({
          ...allow('role:clerk', INVOICE_TOKEN, ['update']),
          ...allow('role:clerk', INVOICE_LINE_TOKEN, ['create']),
          [`role:clerk ${INVOICE_LINE_TOKEN} update`]: WITHOUT_SKU,
        });

        await expect(
          invoices.update(
            INVOICE,
            { number: '2', lines: [{ ...LINE, sku: 'b' }] },
            { ctx: actorCtx(CLERK) },
          ),
        ).rejects.toThrow(AuthorityRefusedException);
        expect(invoices.stored).toEqual([INVOICE]);
        expect(lines.stored).toEqual([LINE]);
      });

      it('should replace nothing when the actor may not replace a related row whole', async () => {
        const { invoices, lines } = await seeded({
          ...allow('role:clerk', INVOICE_TOKEN, ['update']),
          ...allow('role:clerk', INVOICE_LINE_TOKEN, ['create', 'delete']),
          [`role:clerk ${INVOICE_LINE_TOKEN} update`]: WITHOUT_SKU,
        });

        await expect(
          invoices.replace(
            INVOICE,
            {
              tenantId: INVOICE.tenantId,
              number: '2',
              dateDeleted: null,
              lines: [{ id: LINE.id, tenantId: LINE.tenantId }],
            },
            { ctx: actorCtx(CLERK) },
          ),
        ).rejects.toThrow(AuthorityRefusedException);
        expect(invoices.stored).toEqual([INVOICE]);
        expect(lines.stored).toEqual([LINE]);
      });

      it('should hold a new related row a replace creates to what create allows', async () => {
        const { invoices, lines } = await seeded({
          ...allow('role:clerk', INVOICE_TOKEN, ['update']),
          ...allow('role:clerk', INVOICE_LINE_TOKEN, ['create', 'delete']),
          [`role:clerk ${INVOICE_LINE_TOKEN} update`]: WITHOUT_SKU,
        });

        await invoices.replace(
          INVOICE,
          {
            tenantId: INVOICE.tenantId,
            number: '2',
            dateDeleted: null,
            lines: [{ tenantId: LINE.tenantId, sku: 'b' }],
          },
          { ctx: actorCtx(CLERK) },
        );

        expect(lines.stored.map(({ sku }) => sku)).toEqual(['b']);
      });

      it('should refuse a column a related row’s hook adds that the actor may not write', async () => {
        @RepoHook()
        class SkuStampHook {
          @BeforeCreate({ replace: true })
          beforeCreate(line: PlainLiteralObject) {
            return { ...line, sku: 'stamped' };
          }
        }
        const noSku: AuthorityDecision = {
          effect: 'allow',
          columns: ['tenantId', 'dateDeleted'],
        };
        const { invoices, lines } = await start(
          {
            ...allow('role:clerk', INVOICE_TOKEN, ['create']),
            [`role:clerk ${INVOICE_LINE_TOKEN} create`]: noSku,
          },
          [SkuStampHook],
        );

        const error = await invoices
          .create(
            {
              ...INVOICE,
              lines: [{ id: LINE.id, tenantId: LINE.tenantId }],
            },
            { ctx: actorCtx(CLERK) },
          )
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AuthorityRefusedException);
        expect(error).toMatchObject({ context: { columns: ['sku'] } });
        expect(lines.stored).toEqual([]);
      });

      it('should leave a related row’s other properties to its write, after its hooks', async () => {
        @RepoHook()
        class SkuFromCodeHook {
          @BeforeCreate({ replace: true })
          beforeCreate({ code, ...line }: PlainLiteralObject) {
            return { ...line, sku: code };
          }
        }
        const { invoices, lines } = await start(
          {
            ...allow('role:clerk', INVOICE_TOKEN, ['create']),
            ...allow('role:clerk', INVOICE_LINE_TOKEN, ['create']),
          },
          [SkuFromCodeHook],
        );

        // Not a column of the line: the line's hook makes it one.
        const coded = { id: LINE.id, tenantId: LINE.tenantId, code: 'a' };
        await invoices.create(
          { ...INVOICE, lines: [coded] },
          { ctx: actorCtx(CLERK) },
        );

        expect(lines.stored).toEqual([LINE]);
      });

      it('should create nothing when a related row sets its delete date and the actor may not soft delete it', async () => {
        const { invoices, lines } = await start({
          ...allow('role:clerk', INVOICE_TOKEN, ['create']),
          ...allow('role:clerk', INVOICE_LINE_TOKEN, ['create']),
        });

        const error = await invoices
          .create(
            { ...INVOICE, lines: [{ ...LINE, dateDeleted: new Date() }] },
            { ctx: actorCtx(CLERK) },
          )
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AuthorityRefusedException);
        expect(error).toMatchObject({ context: { action: 'softDelete' } });
        expect(invoices.stored).toEqual([]);
        expect(lines.stored).toEqual([]);
      });

      it('should not count a delete’s columns against the rows a write sets', async () => {
        const { invoices, receipts } = await seeded({
          ...allow('role:clerk', INVOICE_TOKEN, ['update']),
          ...allow('role:clerk', RECEIPT_TOKEN, ['create', 'update']),
          [`role:clerk ${RECEIPT_TOKEN} delete`]: {
            effect: 'allow',
            columns: [],
          },
        });

        await invoices.update(
          INVOICE,
          { receipt: { ...RECEIPT, total: 20 } },
          { ctx: actorCtx(CLERK) },
        );

        expect(receipts.stored).toEqual([{ ...RECEIPT, total: 20 }]);
      });
    });

    describe('the foreign key a cascade links a related row by', () => {
      const SKU_ONLY: AuthorityDecision = {
        effect: 'allow',
        columns: ['tenantId', 'sku', 'dateDeleted'],
      };
      const LINES_BY_SKU: AuthorityTableFixture = {
        [`role:clerk ${INVOICE_LINE_TOKEN} create`]: SKU_ONLY,
        [`role:clerk ${INVOICE_LINE_TOKEN} update`]: SKU_ONLY,
      };

      it('should not be counted against the actor on a cascaded create', async () => {
        const { invoices, lines } = await start({
          ...allow('role:clerk', INVOICE_TOKEN, ['create']),
          ...LINES_BY_SKU,
        });

        await invoices.create(
          { ...INVOICE, lines: [LINE] },
          { ctx: actorCtx(CLERK) },
        );

        expect(lines.stored).toEqual([LINE]);
      });

      it('should not be counted against the actor on a cascaded update', async () => {
        const { invoices, lines } = await seeded({
          ...allow('role:clerk', INVOICE_TOKEN, ['update']),
          ...LINES_BY_SKU,
        });

        await invoices.update(
          INVOICE,
          { lines: [{ ...LINE, sku: 'b' }] },
          { ctx: actorCtx(CLERK) },
        );

        expect(lines.stored).toEqual([{ ...LINE, sku: 'b' }]);
      });

      it('should still be checked when the caller writes the related row itself', async () => {
        const { lines } = await start(LINES_BY_SKU);

        const error = await lines
          .create(LINE, { ctx: actorCtx(CLERK) })
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AuthorityRefusedException);
        expect(error).toMatchObject({ context: { columns: ['invoiceId'] } });
      });
    });
  });

  describe('federated relations', () => {
    it('should refuse, as forbidden, a join by a column the actor may not read', async () => {
      const decision: AuthorityDecision = {
        effect: 'allow',
        columns: ['name'],
      };
      const moduleRef = await Test.createTestingModule({
        imports: [
          CoreModule.forRoot({}),
          RepositoryModule.forRoot({
            imports: [
              deciders(
                new AuthorityFixture({
                  [`role:clerk ${AUTHOR_TOKEN} read`]: decision,
                }),
              ),
            ],
            adapters: [
              {
                adapter: MemoryRepositoryModuleFixture,
                entities: [
                  {
                    key: AUTHOR_TOKEN,
                    entity: AuthorEntityFixture,
                    relations: { posts: { federated: true } },
                    authority: {
                      access: 'governed',
                      authority: AuthorityFixture,
                    },
                  },
                  { key: POST_TOKEN, entity: PostEntityFixture },
                ],
              },
            ],
          }),
        ],
      }).compile();
      const authors = moduleRef.get<MemoryRepositoryFixture<AuthorFixture>>(
        getDynamicRepositoryToken(AUTHOR_TOKEN),
      );

      const error = await authors
        .find({ join: [{ relation: 'posts' }], ctx: actorCtx(CLERK) })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AuthorityRefusedException);
      expect(error).toMatchObject({ context: { columns: ['id'] } });
    });
  });
});

/** Hands every read on to an admin's ctx. */
@RepoHook()
class ReadsAsAdminHook {
  @BeforeRead()
  beforeRead(options: RepositoryFindOptions<PlainLiteralObject>) {
    return { ...options, ctx: actorCtx(ADMIN) };
  }
}

function deciders(authority: AuthorityFixture, hooks: Type[] = []) {
  @Module({
    providers: [{ provide: AuthorityFixture, useValue: authority }, ...hooks],
    exports: [AuthorityFixture, ...hooks],
  })
  class DecidersModule {}
  return DecidersModule;
}
