import request from 'supertest';
import { DataSource } from 'typeorm';

import { type INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreModule } from '@concepta/nestjs-core';
import { RepositoryModule, RowScopeCtx } from '@concepta/nestjs-repository';

import {
  applyTenantPolicy,
  createRlsAdmin,
  rlsAppUrl,
} from '../../__fixtures__/rls/rls-database.fixture.js';
import { RlsPrincipalOverlayFixture } from '../../__fixtures__/rls/rls-principal.overlay.fixture.js';
import {
  RlsProjectEntityFixture,
  RlsTaskEntityFixture,
} from '../../__fixtures__/rls/rls-project-task.entity.fixture.js';
import {
  RlsProjectRowScopeFixture,
  RlsRowScopeModuleFixture,
  RlsTaskRowScopeFixture,
} from '../../__fixtures__/rls/rls-row-scope.fixture.js';
import {
  RLS_PROJECTS_KEY,
  RLS_TASKS_KEY,
  RlsTaskControllerFixture,
} from '../../__fixtures__/rls/rls-task.controller.fixture.js';
import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';

/**
 * Row scope and Postgres row-level security together, through HTTP: row
 * scope holds each user to their own tasks (a tenant admin to the tenant),
 * and the README's policy recipe holds every query in a transaction to the
 * caller's tenant, whether or not it goes through a repository.
 */
const TENANT_A = '00000000-0000-4000-8000-00000000000a';
const TENANT_B = '00000000-0000-4000-8000-00000000000b';
const ALICE = '00000000-0000-4000-8000-0000000000a1';
const BOB = '00000000-0000-4000-8000-0000000000a2';
const CAROL = '00000000-0000-4000-8000-0000000000b1';

const alice = { 'x-tenant': TENANT_A, 'x-user': ALICE };
const bobTenantAdmin = {
  'x-tenant': TENANT_A,
  'x-user': BOB,
  'x-role': 'tenant-admin',
};
const carol = { 'x-tenant': TENANT_B, 'x-user': CAROL };

describe('row scope and row-level security on Postgres', () => {
  let admin: DataSource;
  let app: INestApplication;
  let projectA: string;
  let projectB: string;

  const as = (headers: Record<string, string>) => ({
    get: (url: string) => request(app.getHttpServer()).get(url).set(headers),
    post: (url: string, body: object) =>
      request(app.getHttpServer()).post(url).set(headers).send(body),
  });

  beforeAll(async () => {
    admin = await createRlsAdmin([
      RlsProjectEntityFixture,
      RlsTaskEntityFixture,
    ]);
    await applyTenantPolicy(admin, 'rls_project', 'tenantId');
    await applyTenantPolicy(admin, 'rls_task', 'tenantId');

    const moduleRef = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: rlsAppUrl(),
          entities: [RlsProjectEntityFixture, RlsTaskEntityFixture],
          extra: { max: 1 },
        }),
        RepositoryModule.forRoot({
          imports: [RlsRowScopeModuleFixture],
          drivers: [
            {
              driver: TypeOrmRepositoryModule,
              entities: [
                {
                  key: RLS_PROJECTS_KEY,
                  entity: RlsProjectEntityFixture,
                  rowScope: {
                    access: 'scoped',
                    resolver: RlsProjectRowScopeFixture,
                  },
                },
                {
                  key: RLS_TASKS_KEY,
                  entity: RlsTaskEntityFixture,
                  rowScope: {
                    access: 'scoped',
                    resolver: RlsTaskRowScopeFixture,
                  },
                },
              ],
              options: {
                transactionSettings: (ctx) => ({
                  'app.tenant_id': ctx.supports(RowScopeCtx)
                    ? ctx.with(RowScopeCtx).tenantId
                    : undefined,
                }),
              },
            },
          ],
        }),
        RepositoryModule.forFeature([RLS_PROJECTS_KEY, RLS_TASKS_KEY]),
      ],
      controllers: [RlsTaskControllerFixture],
      providers: [
        { provide: APP_INTERCEPTOR, useClass: RlsPrincipalOverlayFixture },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await admin.query('delete from rls_task');
    await admin.query('delete from rls_project');

    const [a, b] = await admin.getRepository(RlsProjectEntityFixture).save([
      { tenantId: TENANT_A, name: 'project-a' },
      { tenantId: TENANT_B, name: 'project-b' },
    ]);
    projectA = a.id;
    projectB = b.id;

    await admin.getRepository(RlsTaskEntityFixture).save([
      { tenantId: TENANT_A, userId: ALICE, projectId: a.id, title: 'alice-1' },
      { tenantId: TENANT_A, userId: BOB, projectId: a.id, title: 'bob-1' },
      { tenantId: TENANT_B, userId: CAROL, projectId: b.id, title: 'carol-1' },
    ]);
  });

  afterAll(async () => {
    await app?.close();
    await admin?.destroy();
  });

  describe('reads', () => {
    it('gives a user their own tasks', async () => {
      await as(alice).get('/tasks').expect(200, ['alice-1']);
      await as(carol).get('/tasks').expect(200, ['carol-1']);
    });

    it("gives a tenant admin the tenant's tasks", async () => {
      await as(bobTenantAdmin).get('/tasks').expect(200, ['alice-1', 'bob-1']);
    });

    it('joins projects to tasks only for a caller who reads the whole tenant', async () => {
      await as(alice).get('/projects-with-tasks').expect(400);
      await as(bobTenantAdmin)
        .get('/projects-with-tasks')
        .expect(200, ['project-a:alice-1,bob-1']);
    });

    it("holds SQL that bypasses the repository to the caller's tenant, not to the user", async () => {
      await as(alice).get('/raw-task-report').expect(200, ['alice-1', 'bob-1']);
      await as(carol).get('/raw-task-report').expect(200, ['carol-1']);
    });

    it('reads nothing when the endpoint has no transaction', async () => {
      await as(alice).get('/tasks-without-transaction').expect(200, []);
    });

    it('refuses a caller with no principal', async () => {
      await as({}).get('/tasks').expect(403);
    });

    it('reads nothing on the pool, outside any transaction', async () => {
      const pool = await new DataSource({
        type: 'postgres',
        url: rlsAppUrl(),
      }).initialize();

      try {
        expect(await pool.query('select title from rls_task')).toEqual([]);
      } finally {
        await pool.destroy();
      }
    });
  });

  describe('writes', () => {
    it('creates a task in the caller’s tenant, for the caller', async () => {
      await as(alice)
        .post('/tasks', { projectId: projectA, title: 'alice-2' })
        .expect(201, { title: 'alice-2' });

      await as(alice).get('/tasks').expect(200, ['alice-1', 'alice-2']);
      await as(carol).get('/tasks').expect(200, ['carol-1']);
    });

    it('refuses a task claiming another tenant or another user', async () => {
      await as(alice)
        .post('/tasks', {
          tenantId: TENANT_B,
          projectId: projectB,
          title: 'forged-tenant',
        })
        .expect(403);
      await as(alice)
        .post('/tasks', {
          userId: BOB,
          projectId: projectA,
          title: 'forged-user',
        })
        .expect(403);

      await as(bobTenantAdmin).get('/tasks').expect(200, ['alice-1', 'bob-1']);
    });

    it("refuses a task in another tenant's project at the foreign key", async () => {
      const res = await as(alice)
        .post('/tasks', { projectId: projectB, title: 'cross-tenant' })
        .expect(500);

      expect(res.body.errorCode).toBe('REPOSITORY_DATABASE_ERROR');
      await as(alice).get('/tasks').expect(200, ['alice-1']);
      await as(carol).get('/tasks').expect(200, ['carol-1']);
    });
  });
});
