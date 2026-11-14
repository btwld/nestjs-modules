import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { bearer, refused } from '../shared/demo-e2e.util.js';

import { PerUserGrantsModule } from './per-user-grants.module.js';

const EXPORT = { action: 'export', subject: 'report' };

describe('Example: per-user grants from storage', () => {
  let app: INestApplication;
  let api: ReturnType<typeof supertest>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PerUserGrantsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    api = supertest(app.getHttpServer());
  });

  afterEach(() => app.close());

  it('shows an analyst a report without payroll, as their role template says', () =>
    api
      .get('/reports/q3')
      .set(bearer('ana'))
      .expect(200)
      .expect({ id: 'q3', title: 'Q3 results', revenue: 940000 }));

  it('lets one analyst export once an admin grants it, and only that analyst', async () => {
    await api
      .post('/reports/q3/export')
      .set(bearer('ana'))
      .expect(403)
      .expect(refused('export', 'report', 'no-grant'));

    await api
      .put('/admin/users/ana/rules')
      .set(bearer('root'))
      .send([EXPORT])
      .expect(200)
      .expect([EXPORT]);

    await api
      .post('/reports/q3/export')
      .set(bearer('ana'))
      .expect(201)
      .expect({ id: 'q3', url: 'https://files.example.com/reports/q3.csv' });
    await api.post('/reports/q3/export').set(bearer('ali')).expect(403);
  });

  it('never lets a user rule undo a deny in the role template', async () => {
    await api
      .put('/admin/users/ana/rules')
      .set(bearer('root'))
      .send([{ action: 'read', subject: 'report', fields: ['payroll'] }])
      .expect(200);

    await api
      .get('/reports/q3')
      .set(bearer('ana'))
      .expect(200)
      .expect({ id: 'q3', title: 'Q3 results', revenue: 940000 });
  });

  it('shows a caller what they may do, for a UI', async () => {
    await api
      .put('/admin/users/ana/rules')
      .set(bearer('root'))
      .send([EXPORT])
      .expect(200);

    await api
      .get('/me/permissions')
      .set(bearer('ana'))
      .expect(200)
      .expect([
        { action: 'read', subject: 'report' },
        { action: 'export', subject: 'report' },
        {
          action: 'read',
          subject: 'report',
          fields: ['payroll'],
          inverted: true,
          reason: 'payroll is for HR',
        },
      ]);
  });

  it('shows a caller who is not signed in that they may do nothing', () =>
    api.get('/me/permissions').expect(200).expect([]));

  it('refuses to save rules that cannot be used, listing every problem', () =>
    api
      .put('/admin/users/ana/rules')
      .set(bearer('root'))
      .send([
        { action: 'manage', subject: 'all' },
        {
          action: 'read reports',
          subject: 'report',
          conditions: { ownerId: 'ana' },
        },
      ])
      .expect(400)
      .expect({
        statusCode: 400,
        error: 'Bad Request',
        message: [
          'user ana rule 0: action "manage" is reserved',
          'user ana rule 0: subject "all" is reserved',
          'user ana rule 1: conditions are not supported; which rows a caller reaches is row scope',
          'user ana rule 1: action "read reports" must be a verb, such as read or approve',
        ],
      }));

  it('refuses an analyst editing anyone’s rules, their own included', () =>
    api
      .put('/admin/users/ana/rules')
      .set(bearer('ana'))
      .send([EXPORT])
      .expect(403)
      .expect(refused('update', 'user-rules', 'no-grant')));

  it('refuses an admin editing their own rules', async () => {
    await api
      .put('/admin/users/root/rules')
      .set(bearer('root'))
      .send([EXPORT])
      .expect(403)
      .expect({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Nobody edits their own rules',
      });

    await api
      .post('/reports/q3/export')
      .set(bearer('root'))
      .expect(403)
      .expect(refused('export', 'report', 'no-grant'));
  });

  it('refuses an admin handing the power to edit rules to one user', async () => {
    await api
      .put('/admin/users/ana/rules')
      .set(bearer('root'))
      .send([{ action: 'update', subject: ['report', 'user-rules'] }])
      .expect(400)
      .expect({
        statusCode: 400,
        error: 'Bad Request',
        message: ['user ana rule 0: user-rules comes from a role'],
      });

    await api.get('/admin/users/ana/rules').set(bearer('root')).expect([]);
  });
});
