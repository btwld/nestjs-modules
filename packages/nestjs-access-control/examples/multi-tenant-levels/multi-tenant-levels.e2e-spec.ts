import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import {
  accessGrantsProblems,
  accessRuleProblems,
} from '@concepta/nestjs-access-control';

import { bearer, refused } from '../shared/demo-e2e.util.js';

import { ACCESS_LEVELS } from './access-level.type.js';
import { levelGrants, levelRules } from './level-rules.util.js';
import { MultiTenantLevelsModule } from './multi-tenant-levels.module.js';
import { ROLE_LEVELS } from './tenant-directory.js';

const ROCKET = {
  id: 'p-1',
  tenantId: 'acme',
  ownerId: 'alice',
  name: 'Rocket',
};
const LAUNCHPAD = {
  id: 'p-2',
  tenantId: 'acme',
  ownerId: 'bob',
  name: 'Launchpad',
};
const FUEL_STUDY = {
  id: 'p-4',
  tenantId: 'acme',
  ownerId: 'cara',
  name: 'Fuel study',
};

describe('Example: multi-tenant access levels', () => {
  describe('levels', () => {
    it('stand for rules', () => {
      expect(levelRules('project', 'none')).toEqual([]);
      expect(levelRules('project', 'edit-own')).toEqual([
        {
          action: ['read:any', 'create:own', 'update:own'],
          subject: 'project',
        },
      ]);
      expect(levelRules('project', 'full')).toEqual([
        {
          action: ['read:any', 'create:any', 'update:any', 'delete:any'],
          subject: 'project',
        },
      ]);
    });

    it.each(ACCESS_LEVELS)(
      '%s stands for rules the module accepts',
      (level) => {
        expect(accessRuleProblems(levelRules('project', level), level)).toEqual(
          [],
        );
      },
    );

    it('make grants the module accepts', () => {
      expect(accessGrantsProblems(levelGrants(ROLE_LEVELS))).toEqual([]);
    });
  });

  describe('routes', () => {
    let app: INestApplication;
    let api: ReturnType<typeof supertest>;

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [MultiTenantLevelsModule],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
      api = supertest(app.getHttpServer());
    });

    afterEach(() => app.close());

    it('lets a manager delete a project in their tenant', async () => {
      await api
        .delete('/tenants/acme/projects/p-2')
        .set(bearer('alice'))
        .expect(200);

      await api
        .get('/tenants/acme/projects')
        .set(bearer('alice'))
        .expect(200)
        .expect([ROCKET, FUEL_STUDY]);
    });

    it('gives the same person only a guest’s access in another tenant', async () => {
      await api
        .get('/tenants/globex/projects')
        .set(bearer('alice'))
        .expect(200)
        .expect([
          { id: 'p-3', tenantId: 'globex', ownerId: 'gina', name: 'Orbit' },
        ]);

      await api
        .delete('/tenants/globex/projects/p-3')
        .set(bearer('alice'))
        .expect(403)
        .expect(refused('delete:any on project (no-grant)'));
    });

    it('shows a contractor on view-own only their own projects', () =>
      api
        .get('/tenants/acme/projects')
        .set(bearer('cara'))
        .expect(200)
        .expect([FUEL_STUDY]));

    it('lets a member rename their own project, not a colleague’s', async () => {
      await api
        .patch('/tenants/acme/projects/p-2')
        .set(bearer('bob'))
        .send({ name: 'Launchpad 2' })
        .expect(200)
        .expect({ ...LAUNCHPAD, name: 'Launchpad 2' });

      await api
        .patch('/tenants/acme/projects/p-1')
        .set(bearer('bob'))
        .send({ name: 'Mine now' })
        .expect(403)
        .expect(refused('update:own on project (access-query)'));
    });

    it('makes a member the owner of what they create', async () => {
      const { body } = await api
        .post('/tenants/acme/projects')
        .set(bearer('bob'))
        .send({ name: 'Pad B' })
        .expect(201);

      expect(body).toEqual({
        id: expect.any(String),
        tenantId: 'acme',
        ownerId: 'bob',
        name: 'Pad B',
      });
    });

    it('keeps the budget from a member and shows it to a manager', async () => {
      await api
        .get('/tenants/acme/budget')
        .set(bearer('bob'))
        .expect(403)
        .expect(refused('read:any on budget (no-grant)'));

      await api
        .get('/tenants/acme/budget')
        .set(bearer('alice'))
        .expect(200)
        .expect({ tenantId: 'acme', total: 250000, spent: 90000 });
    });

    it('refuses everything in a tenant the caller does not belong to', () =>
      api
        .get('/tenants/globex/projects')
        .set(bearer('bob'))
        .expect(403)
        .expect(refused('read:any on project (no-grant)')));
  });
});
