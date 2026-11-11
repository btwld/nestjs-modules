import supertest from 'supertest';

import { ForbiddenException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';

import { Operation } from '@concepta/nestjs-core';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { CRUD_REQUEST_POLICY_TOKEN } from '../crud.constants.js';
import { type CrudRequestInterface } from '../infrastructure/policies/interfaces/crud-request.interface.js';

import { AppCcbCustomModuleFixture } from '../__fixtures__/app-ccb-custom.module.fixture.js';
import { AppCcbSubModuleFixture } from '../__fixtures__/app-ccb-sub.module.fixture.js';
import { AppCcbModuleFixture } from '../__fixtures__/app-ccb.module.fixture.js';
import { AppResolverCqrsModuleFixture } from '../__fixtures__/app-resolver-cqrs.module.fixture.js';
import { AppResolverOperationModuleFixture } from '../__fixtures__/app-resolver-operation.module.fixture.js';
import { AppModuleFixture } from '../__fixtures__/app.module.fixture.js';
import { default as ormConfig } from '../__fixtures__/ormconfig.fixture.js';
import { PhotoFixture } from '../__fixtures__/photo/photo.entity.fixture.js';
import { PhotoSeederFixture } from '../__fixtures__/photo/photo.seeder.fixture.js';

/** A body the create schemas accept as is. */
const BODY = {
  name: 'Sunset',
  description: 'Over the bay',
  filename: 'sunset.jpg',
  isPublished: true,
};

/** The update and replace schemas also require every other field. */
const FULL_BODY = { ...BODY, views: 2 };

/** Every operation, the request that runs it, and the body it carries. */
const OPERATIONS: {
  operation: Operation;
  send: (http: ReturnType<typeof supertest>, id: string) => supertest.Test;
  body?: unknown;
}[] = [
  { operation: Operation.List, send: (h) => h.get('/photo') },
  { operation: Operation.Read, send: (h, id) => h.get(`/photo/${id}`) },
  {
    operation: Operation.Create,
    send: (h) => h.post('/photo').send(BODY),
    body: BODY,
  },
  {
    operation: Operation.CreateBatch,
    send: (h) => h.post('/photo/bulk').send({ bulk: [BODY] }),
    body: { bulk: [BODY] },
  },
  {
    operation: Operation.Update,
    send: (h, id) => h.patch(`/photo/${id}`).send(FULL_BODY),
    body: FULL_BODY,
  },
  {
    operation: Operation.Replace,
    send: (h, id) => h.put(`/photo/${id}`).send(FULL_BODY),
    body: FULL_BODY,
  },
  { operation: Operation.Delete, send: (h, id) => h.delete(`/photo/${id}`) },
  {
    operation: Operation.SoftDelete,
    send: (h, id) => h.delete(`/photo/soft/${id}`),
  },
  {
    operation: Operation.Restore,
    send: (h, id) => h.patch(`/photo/restore/${id}`),
  },
];

describe.each([
  { name: 'forFeature', testModule: AppModuleFixture },
  { name: 'CCB Generated', testModule: AppCcbModuleFixture },
  { name: 'CCB Pre-decorated', testModule: AppCcbCustomModuleFixture },
  { name: 'CCB Subclass', testModule: AppCcbSubModuleFixture },
  { name: 'Operation Resolver', testModule: AppResolverOperationModuleFixture },
  { name: 'CQRS Resolver', testModule: AppResolverCqrsModuleFixture },
])('CRUD request policy ($name)', ({ testModule }) => {
  let app: INestApplication;
  let photo: PhotoFixture;
  const requests: CrudRequestInterface[] = [];
  let refuse = false;

  beforeEach(async () => {
    requests.length = 0;
    refuse = false;

    const moduleRef = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(ormConfig), testModule],
    })
      .overrideProvider(CRUD_REQUEST_POLICY_TOKEN)
      .useValue({
        check: async (request: CrudRequestInterface) => {
          requests.push(request);
          if (refuse) throw new ForbiddenException();
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const dataSource = app.get(getDataSourceToken());
    const seedingSource = new SeedingSource({ dataSource });
    await seedingSource.initialize();
    await seedingSource.run.one(PhotoSeederFixture);
    const [seeded] = await dataSource.getRepository(PhotoFixture).find();
    if (!seeded) throw new Error('nothing seeded');
    photo = seeded;
  });

  afterEach(() => app.close());

  it.each(OPERATIONS)(
    '$operation: asks the policy, with the CRUD context and the body',
    async ({ operation, send, body }) => {
      await send(supertest(app.getHttpServer()), photo.id);

      expect(requests).toHaveLength(1);
      expect(requests[0]?.ctx.operation).toEqual(operation);
      expect(requests[0]?.body).toEqual(body);
    },
  );

  it.each(OPERATIONS)(
    '$operation: a refusal stops it before anything runs',
    async ({ send }) => {
      const photos = app.get(getDataSourceToken()).getRepository(PhotoFixture);
      const before = await photos.find({ withDeleted: true });
      refuse = true;

      await send(supertest(app.getHttpServer()), photo.id).expect(403);

      expect(await photos.find({ withDeleted: true })).toEqual(before);
    },
  );
});
