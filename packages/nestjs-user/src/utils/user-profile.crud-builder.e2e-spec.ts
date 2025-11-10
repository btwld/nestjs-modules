import supertest from 'supertest';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { SeedingSource } from '@concepta/typeorm-seeding';

import { UserProfileFactory } from '../user-profile.factory';
import { UserProfileSeeder } from '../user-profile.seeder';
import { UserFactory } from '../user.factory';

import { AppModuleUserProfileFixture } from '../__fixtures__/app.module.user-profile.fixture';
import { UserProfileEntityFixture } from '../__fixtures__/user-profile.entity.fixture';
import { UserEntityFixture } from '../__fixtures__/user.entity.fixture';

describe('User Profile Crud Builder (e2e)', () => {
  let app: INestApplication;
  let seedingSource: SeedingSource;

  const userFactory = new UserFactory({
    entity: UserEntityFixture,
  });

  const userProfileFactory = new UserProfileFactory({
    entity: UserProfileEntityFixture,
    factories: [userFactory],
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleUserProfileFixture],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    seedingSource = new SeedingSource({
      dataSource: app.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    const userProfileSeeder = new UserProfileSeeder({
      factories: [userProfileFactory],
    });

    await seedingSource.run.one(userProfileSeeder);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    return app ? await app.close() : undefined;
  });

  it('GET /user-profile', async () => {
    const response = await supertest(app.getHttpServer())
      .get('/user-profile?limit=10')
      .expect(200)
      .expect((res) => res.body.data.length === 10);
    expect(response);
  });

  it('GET /user-profile/:id', async () => {
    // get an user so we have an id
    const response = await supertest(app.getHttpServer())
      .get('/user-profile?limit=1')
      .expect(200);

    // get one using that id
    await supertest(app.getHttpServer())
      .get(`/user-profile/${response.body.data[0].id}`)
      .expect(200);
  });

  it('POST /user-profile', async () => {
    // need an user
    const user = await userFactory.create();

    await supertest(app.getHttpServer())
      .post('/user-profile')
      .send({ userId: user.id, firstName: 'Foo' })
      .expect(201);
  });

  it('Patch /user-profile/:id - should update an existing user profile', async () => {
    // need an user
    const user = await userFactory.create();

    // create user profile first
    const createResponse = await supertest(app.getHttpServer())
      .post('/user-profile')
      .send({ userId: user.id, firstName: 'Bar' })
      .expect(201);

    const id = createResponse.body.id;
    const updatedResponse = await supertest(app.getHttpServer())
      .patch(`/user-profile/${id}`)
      .send({
        firstName: 'Updated Profile',
      })
      .expect(200);

    expect(updatedResponse.body.firstName).toEqual('Updated Profile');
  });

  it('DELETE /user-profile/:id', async () => {
    // get an user so we have an id
    const response = await supertest(app.getHttpServer())
      .get('/user-profile?limit=1')
      .expect(200);

    // delete one using that id
    await supertest(app.getHttpServer())
      .delete(`/user-profile/${response.body.data[0].id}`)
      .expect(200);
  });
});
