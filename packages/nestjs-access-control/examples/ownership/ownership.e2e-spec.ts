import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { bearer, refused } from '../shared/demo-e2e.util.js';

import { OwnershipModule } from './ownership.module.js';

const MAYAS = { id: 'doc-1', ownerId: 'maya', title: 'Maya’s plan' };
const MAXS = { id: 'doc-2', ownerId: 'max', title: 'Max’s notes' };

describe('Example: ownership', () => {
  let app: INestApplication;
  let api: ReturnType<typeof supertest>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [OwnershipModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    api = supertest(app.getHttpServer());
  });

  afterEach(() => app.close());

  describe('reading', () => {
    it('lets a member read their own document', () =>
      api
        .get('/documents/doc-1')
        .set(bearer('maya'))
        .expect(200)
        .expect(MAYAS));

    it('refuses a member reading someone else’s document', () =>
      api
        .get('/documents/doc-2')
        .set(bearer('maya'))
        .expect(403)
        .expect(refused('read on document (access-query)')));

    it('refuses a member a document that does not exist, like someone else’s', () =>
      api
        .get('/documents/doc-404')
        .set(bearer('maya'))
        .expect(403)
        .expect(refused('read on document (access-query)')));

    it('lets a manager read anyone’s document', () =>
      api.get('/documents/doc-2').set(bearer('mia')).expect(200).expect(MAXS));

    it('tells a manager a document does not exist', () =>
      api.get('/documents/doc-404').set(bearer('mia')).expect(404));

    it('lists a member’s own documents, and every document for a manager', async () => {
      await api
        .get('/documents')
        .set(bearer('maya'))
        .expect(200)
        .expect([MAYAS]);
      await api
        .get('/documents')
        .set(bearer('mia'))
        .expect(200)
        .expect([MAYAS, MAXS]);
    });
  });

  describe('editing', () => {
    const documentAsAdmin = async (id: string) =>
      (await api.get(`/documents/${id}`).set(bearer('ola')).expect(200)).body;

    it('lets a member rename only their own document', async () => {
      await api
        .patch('/documents/doc-1')
        .set(bearer('maya'))
        .send({ title: 'Maya’s final plan' })
        .expect(200)
        .expect({ ...MAYAS, title: 'Maya’s final plan' });

      await api
        .patch('/documents/doc-2')
        .set(bearer('maya'))
        .send({ title: 'Mine now' })
        .expect(403)
        .expect(refused('update on document (access-query)'));

      expect(await documentAsAdmin('doc-1')).toEqual({
        ...MAYAS,
        title: 'Maya’s final plan',
      });
    });

    it('refuses a member giving their own document away', async () => {
      await api
        .patch('/documents/doc-1')
        .set(bearer('maya'))
        .send({ ownerId: 'max' })
        .expect(403)
        .expect(refused('update on document (field)'));

      expect(await documentAsAdmin('doc-1')).toEqual(MAYAS);
    });

    it('lets an admin change the owner', async () => {
      await api
        .patch('/documents/doc-1')
        .set(bearer('ola'))
        .send({ ownerId: 'max' })
        .expect(200);

      expect(await documentAsAdmin('doc-1')).toEqual({
        ...MAYAS,
        ownerId: 'max',
      });
    });

    it('limits each verb on its own: a member who manages reads anyone’s document, edits only her own', async () => {
      await api.get('/documents/doc-2').set(bearer('mel')).expect(200, MAXS);

      await api
        .patch('/documents/doc-2')
        .set(bearer('mel'))
        .send({ title: 'Mine now' })
        .expect(403)
        .expect(refused('update on document (access-query)'));

      expect(await documentAsAdmin('doc-2')).toEqual(MAXS);
    });

    it('refuses a manager editing, since reading is all they hold', () =>
      api
        .patch('/documents/doc-2')
        .set(bearer('mia'))
        .send({ title: 'Edited' })
        .expect(403)
        .expect(refused('update on document (no-grant)')));
  });
});
