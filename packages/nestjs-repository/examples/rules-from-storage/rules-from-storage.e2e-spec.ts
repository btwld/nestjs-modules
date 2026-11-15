import request from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ActorCtx, AppContextHost } from '@concepta/nestjs-core';
import {
  AuthorityRefusedException,
  getDynamicRepositoryToken,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type DocumentEntity } from './document.entity.js';
import { RulesFromStorageModule } from './rules-from-storage.module.js';
import { DOCUMENT } from './stored-rules.js';

describe('Rules from storage', () => {
  let app: INestApplication;
  let documents: RepositoryInterface<DocumentEntity>;

  const as = (roles: string) => ({ 'X-Roles': roles });
  const grant = (rule: object) =>
    request(app.getHttpServer())
      .post('/rules')
      .set(as('admin'))
      .send(rule)
      .expect(201);

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RulesFromStorageModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    documents = app.get(getDynamicRepositoryToken(DOCUMENT));
    const seeder = new AppContextHost();
    seeder.defineOverlay(
      ActorCtx,
      { kind: 'system', name: 'seeder' },
      {
        immutable: true,
      },
    );
    await grant({
      actorKey: 'system:seeder',
      action: 'create',
      subject: DOCUMENT,
    });
    await documents.create(
      { title: 'Handbook', body: 'Be kind.' },
      { ctx: seeder },
    );
  });

  afterEach(() => app.close());

  it('nobody reads documents until a rule says so', async () => {
    await request(app.getHttpServer())
      .get('/documents')
      .set(as('clerk'))
      .expect(403);
  });

  it('a rule an admin adds decides the very next request', async () => {
    await grant({ actorKey: 'role:clerk', action: 'read', subject: DOCUMENT });

    const listed = await request(app.getHttpServer())
      .get('/documents')
      .set(as('clerk'))
      .expect(200);

    expect(listed.body).toEqual([
      { id: expect.any(String), title: 'Handbook', body: 'Be kind.' },
    ]);
  });

  it('a rule can allow some columns only', async () => {
    await grant({
      actorKey: 'role:intern',
      action: 'read',
      subject: DOCUMENT,
      fields: ['id', 'title'],
    });

    const listed = await request(app.getHttpServer())
      .get('/documents')
      .set(as('intern'))
      .expect(200);

    expect(listed.body).toEqual([
      { id: expect.any(String), title: 'Handbook' },
    ]);
  });

  it('removing a rule takes the access away again', async () => {
    const rule = await grant({
      actorKey: 'role:clerk',
      action: 'read',
      subject: DOCUMENT,
    });

    await request(app.getHttpServer())
      .delete(`/rules/${rule.body.id}`)
      .set(as('admin'))
      .expect(200);

    await request(app.getHttpServer())
      .get('/documents')
      .set(as('clerk'))
      .expect(403);
  });

  it('a deny waiting on a decision refuses, and names the decision in its context', async () => {
    await grant({ actorKey: 'role:clerk', action: 'read', subject: DOCUMENT });
    await grant({
      actorKey: 'role:clerk',
      action: 'read',
      subject: DOCUMENT,
      inverted: true,
      reason: 'DEC-7: documents await legal review',
    });

    const response = await request(app.getHttpServer())
      .get('/documents')
      .set(as('clerk'))
      .expect(403);
    // The response never names the decision...
    expect(JSON.stringify(response.body)).not.toContain('DEC-7');

    // ...but the refusal your logs see does.
    const clerk = new AppContextHost();
    clerk.defineOverlay(
      ActorCtx,
      { kind: 'role', roles: ['clerk'] },
      {
        immutable: true,
      },
    );
    const refusal = await documents
      .find({ ctx: clerk })
      .catch((e: unknown) => e);
    expect(refusal).toBeInstanceOf(AuthorityRefusedException);
    expect(refusal).toMatchObject({
      context: { gate: 'DEC-7: documents await legal review' },
    });
  });

  it('a rule the authority cannot use is refused before it is saved', async () => {
    const refused = await request(app.getHttpServer())
      .post('/rules')
      .set(as('admin'))
      .send({ actorKey: 'role:clerk', action: 'manage', subject: DOCUMENT })
      .expect(400);
    expect(refused.body.message).toEqual([
      'body rule 0: action "manage" is reserved',
    ]);

    // Nothing was stored: the clerk is still refused, not failed by it.
    await request(app.getHttpServer())
      .get('/documents')
      .set(as('clerk'))
      .expect(403);
  });

  it('only an admin edits the rules', async () => {
    await request(app.getHttpServer())
      .post('/rules')
      .set(as('clerk'))
      .send({ actorKey: 'role:clerk', action: 'read', subject: DOCUMENT })
      .expect(403);
  });
});
