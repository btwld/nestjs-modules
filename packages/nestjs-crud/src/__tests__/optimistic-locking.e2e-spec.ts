import request from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppVersionedModuleFixture } from '../__fixtures__/app-versioned.module.fixture.js';
import { VersionedFixture } from '../__fixtures__/versioned/versioned.entity.fixture.js';

/**
 * The reported flow from #472: a client-supplied `If-Match` reaching the
 * repository's optimistic lock, closing the cross-request lost-update
 * window the in-request compare-and-swap (#469) could not.
 */
describe('optimistic locking (If-Match / ETag)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          synchronize: true,
          entities: [VersionedFixture],
        }),
        AppVersionedModuleFixture,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  afterEach(async () => {
    await app?.close();
  });

  async function createVersioned(name = 'Alice') {
    const response = await request(server)
      .post('/versioned')
      .send({ name })
      .expect(201);
    return response.body as { id: string; version: number };
  }

  describe('reading a resource', () => {
    it('should return ETag and a body carrying version on Read', async () => {
      const created = await createVersioned();

      const response = await request(server)
        .get(`/versioned/${created.id}`)
        .expect(200);

      expect(response.headers.etag).toEqual(`"${created.version}"`);
      expect(response.body.version).toEqual(created.version);
    });

    // Express itself auto-generates a weak, content-hash ETag for any
    // response that doesn't already carry one (its own default caching
    // behavior, unrelated to this feature) — these assert only that our
    // strong, version-based tag was correctly withheld, not that no header
    // exists at all.
    const STRONG_VERSION_TAG = /^"\d+"$/;

    it('should carry version per item and no strong ETag on List', async () => {
      await createVersioned('Alice');
      await createVersioned('Bob');

      const response = await request(server).get('/versioned').expect(200);

      expect(response.headers.etag).not.toMatch(STRONG_VERSION_TAG);
      for (const item of response.body.data) {
        expect(typeof item.version).toEqual('number');
      }
    });

    it('should omit the strong ETag when the response is narrowed with select', async () => {
      const created = await createVersioned();

      const response = await request(server)
        .get(`/versioned/${created.id}?select=id`)
        .expect(200);

      expect(response.headers.etag).not.toMatch(STRONG_VERSION_TAG);
    });
  });

  describe('update with If-Match', () => {
    it('should succeed and advance the ETag when If-Match matches', async () => {
      const created = await createVersioned();

      const response = await request(server)
        .patch(`/versioned/${created.id}`)
        .set('If-Match', `"${created.version}"`)
        .send({ name: 'Bob' })
        .expect(200);

      expect(response.headers.etag).toEqual(`"${created.version + 1}"`);
      expect(response.body.name).toEqual('Bob');
    });

    it("should reproduce the #472 timeline: a concurrent write invalidates the first client's stale If-Match", async () => {
      const created = await createVersioned();

      // A reads the row.
      const aRead = await request(server)
        .get(`/versioned/${created.id}`)
        .expect(200);

      // B reads the same row, then saves first.
      await request(server)
        .patch(`/versioned/${created.id}`)
        .set('If-Match', `"${created.version}"`)
        .send({ name: 'Bob wrote this' })
        .expect(200);

      // A, still holding the original ETag, saves — this must now conflict
      // instead of silently overwriting B's change (the bug this issue
      // reports: this returned 200 before #472).
      await request(server)
        .patch(`/versioned/${created.id}`)
        .set('If-Match', aRead.headers.etag)
        .send({ name: 'Alice overwrites' })
        .expect(409);

      const final = await request(server)
        .get(`/versioned/${created.id}`)
        .expect(200);
      expect(final.body.name).toEqual('Bob wrote this');
    });

    it('should succeed with no If-Match at all (unchanged, non-breaking behavior)', async () => {
      const created = await createVersioned();

      await request(server)
        .patch(`/versioned/${created.id}`)
        .send({ name: 'Bob' })
        .expect(200);
    });
  });

  describe('delete and soft-delete with a stale If-Match', () => {
    it('should reject DELETE with a stale If-Match', async () => {
      const created = await createVersioned();
      await request(server)
        .patch(`/versioned/${created.id}`)
        .send({ name: 'Concurrent' })
        .expect(200);

      await request(server)
        .delete(`/versioned/${created.id}`)
        .set('If-Match', `"${created.version}"`)
        .expect(409);
    });

    it('should reject soft-delete with a stale If-Match', async () => {
      const created = await createVersioned();
      await request(server)
        .patch(`/versioned/${created.id}`)
        .send({ name: 'Concurrent' })
        .expect(200);

      await request(server)
        .delete(`/versioned/soft/${created.id}`)
        .set('If-Match', `"${created.version}"`)
        .expect(409);
    });
  });

  describe('@CrudRequireVersion', () => {
    it('should reject with 428 when no If-Match is sent (controller-level, inherited by Update)', async () => {
      const created = await createVersioned();

      await request(server)
        .patch(`/versioned-required/${created.id}`)
        .send({ name: 'Bob' })
        .expect(428);
    });

    it('should reject with 428 when If-Match: * is sent — it states no version', async () => {
      const created = await createVersioned();

      await request(server)
        .patch(`/versioned-required/${created.id}`)
        .set('If-Match', '*')
        .send({ name: 'Bob' })
        .expect(428);
    });

    it('should succeed when a valid If-Match is sent (controller-level, inherited by Update)', async () => {
      const created = await createVersioned();

      await request(server)
        .patch(`/versioned-required/${created.id}`)
        .set('If-Match', `"${created.version}"`)
        .send({ name: 'Bob' })
        .expect(200);
    });

    it('should reject with 428 on Delete (controller-level, inherited)', async () => {
      const created = await createVersioned();

      await request(server)
        .delete(`/versioned-required/${created.id}`)
        .expect(428);
    });

    it('should succeed on Replace with no If-Match — route-level override back to false', async () => {
      const created = await createVersioned();

      await request(server)
        .put(`/versioned-required/${created.id}`)
        .send({ name: 'Bob' })
        .expect(200);
    });
  });
});
