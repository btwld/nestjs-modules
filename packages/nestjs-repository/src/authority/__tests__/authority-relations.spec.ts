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
  RECEIPT_TOKEN,
  ReceiptEntityFixture,
  type ReceiptFixture,
} from '../../__fixtures__/memory/cascade.fixture.js';
import {
  AUTHOR_TOKEN,
  AuthorEntityFixture,
  type AuthorFixture,
  POST_TOKEN,
  PostEntityFixture,
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
      protected override async doCount(
        options: RepositoryFindOptions<EmployeeFixture> = {},
      ): Promise<number> {
        this.reads.push(options);
        return this.rows.length;
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

    function start(table: AuthorityTableFixture) {
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
      });
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

      await expect(
        employees.findOne({
          where: Where.eq('id', 'emp-9'),
          join: [{ relation: 'department' }],
          ctx: actorCtx(CLERK),
        }),
      ).resolves.toBeNull();
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
              drivers: [
                {
                  driver: MemoryRepositoryModuleFixture,
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
            drivers: [{ driver: MemoryRepositoryModuleFixture, entities }],
          }),
        ],
      }).compile();
      const repo = <T extends PlainLiteralObject>(key: string) =>
        moduleRef.get<MemoryRepositoryFixture<T>>(
          getDynamicRepositoryToken(key),
        );
      return {
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

    it('should not decide a related entity with no rows to remove', async () => {
      const { invoices } = await start({
        ...allow('role:admin', INVOICE_TOKEN, ALL),
        ...allow('role:clerk', INVOICE_TOKEN, ['delete']),
      });
      await invoices.create(INVOICE, { ctx: actorCtx(ADMIN) });

      await expect(
        invoices.delete(INVOICE, { ctx: actorCtx(CLERK) }),
      ).resolves.toEqual({ id: INVOICE.id });
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
            drivers: [
              {
                driver: MemoryRepositoryModuleFixture,
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

function deciders(authority: AuthorityFixture, hooks: Type[] = []) {
  @Module({
    providers: [{ provide: AuthorityFixture, useValue: authority }, ...hooks],
    exports: [AuthorityFixture, ...hooks],
  })
  class DecidersModule {}
  return DecidersModule;
}
