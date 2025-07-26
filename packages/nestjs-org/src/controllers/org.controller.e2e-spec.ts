import supertest from 'supertest';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';

import { CrudModule } from '@concepta/nestjs-crud';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { OrgFactory } from '../seeding/org.factory';
import { OrgSeeder } from '../seeding/org.seeder';

import { OrgControllerFixture } from '../__fixtures__/controllers/org.controller.fixture';
import { InvitationEntityFixture } from '../__fixtures__/invitation.entity.fixture';
import { OrgCrudService } from '../__fixtures__/org-crud.service';
import { OrgEntityFixture } from '../__fixtures__/org-entity.fixture';
import { OrgMemberEntityFixture } from '../__fixtures__/org-member.entity.fixture';
import { OrgProfileEntityFixture } from '../__fixtures__/org-profile.entity.fixture';
import { OrgTypeOrmCrudAdapter } from '../__fixtures__/org-typeorm-crud.adapter';
import { OwnerEntityFixture } from '../__fixtures__/owner-entity.fixture';
import { OwnerFactoryFixture } from '../__fixtures__/owner-factory.fixture';
import { OwnerModuleFixture } from '../__fixtures__/owner.module.fixture';
import { UserEntityFixture } from '../__fixtures__/user-entity.fixture';

describe('OrgController (e2e)', () => {
  describe('Rest', () => {
    let app: INestApplication;
    let seedingSource: SeedingSource;

    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: 'sqlite',
            database: ':memory:',
            synchronize: true,
            entities: [
              OrgEntityFixture,
              OwnerEntityFixture,
              OrgMemberEntityFixture,
              OrgProfileEntityFixture,
              UserEntityFixture,
              InvitationEntityFixture,
            ],
          }),
          TypeOrmModule.forFeature([
            OrgEntityFixture,
            OwnerEntityFixture,
            OrgMemberEntityFixture,
            OrgProfileEntityFixture,
            UserEntityFixture,
            InvitationEntityFixture,
          ]),
          CrudModule.forRoot({}),
          OwnerModuleFixture.register(),
        ],
        controllers: [OrgControllerFixture],
        providers: [OrgCrudService, OrgTypeOrmCrudAdapter],
      }).compile();
      app = moduleFixture.createNestApplication();
      await app.init();

      seedingSource = new SeedingSource({
        dataSource: app.get(getDataSourceToken()),
      });

      await seedingSource.initialize();

      const orgSeeder = new OrgSeeder({
        factories: [
          new OrgFactory({
            entity: OrgEntityFixture,
            factories: [new OwnerFactoryFixture()],
          }),
        ],
      });

      await seedingSource.run.one(orgSeeder);
    });

    afterEach(async () => {
      jest.clearAllMocks();
      return app ? await app.close() : undefined;
    });

    it('GET /org', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/org?limit=10')
        .expect(200)
        .expect((res) => res.body.length === 10);
      expect(response);
    });

    it('GET /org/:id', async () => {
      // get an org so we have an id
      const response = await supertest(app.getHttpServer())
        .get('/org?limit=1')
        .expect(200);

      // get one using that id
      const getOneResponse = await supertest(app.getHttpServer())
        .get(`/org/${response.body[0].id}`)
        .expect(200);

      // verify properties match
      expect(getOneResponse.body).toEqual(response.body[0]);
    });

    it('POST /org', async () => {
      const ownerFactory = new OwnerFactoryFixture({ seedingSource });
      const owner = await ownerFactory.create();

      const response = await supertest(app.getHttpServer())
        .post('/org')
        .send({
          name: 'company 1',
          ownerId: owner.id,
        })
        .expect(201);

      // verify created org matches input
      expect(response.body.name).toEqual('company 1');
      expect(response.body.ownerId).toEqual(owner.id);
    });

    it('DELETE /org/:id', async () => {
      // get an org so we have an id
      const response = await supertest(app.getHttpServer())
        .get('/org?limit=1')
        .expect(200);

      // delete one using that id
      await supertest(app.getHttpServer())
        .delete(`/org/${response.body[0].id}`)
        .expect(200);
    });

    it('GET /org/:id - should return 404 for a non-existent organization', async () => {
      await supertest(app.getHttpServer()).get('/org/999999').expect(404);
    });

    it('POST /org - should return 400 for missing required fields', async () => {
      await supertest(app.getHttpServer()).post('/org').send({}).expect(400);
    });

    it('PATCH /org/:id - should update an existing organization', async () => {
      const ownerFactory = new OwnerFactoryFixture({ seedingSource });
      const owner = await ownerFactory.create();

      const createResponse = await supertest(app.getHttpServer())
        .post('/org')
        .send({
          name: 'company 1',
          ownerId: owner.id,
        })
        .expect(201);

      const id = createResponse.body.id;
      const updatedResponse = await supertest(app.getHttpServer())
        .patch(`/org/${id}`)
        .send({
          id,
          name: 'updated company',
          active: true,
        })
        .expect(200);

      expect(updatedResponse.body.name).toEqual('updated company');
    });

    it('GET /org - should return all organizations without a limit', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/org')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('DELETE /org/:id - should return 404 for a non-existent organization', async () => {
      await supertest(app.getHttpServer())
        .delete('/org/999999') // Assuming this ID does not exist
        .expect(404);
    });

    it('POST /org - should return 400 for invalid data types', async () => {
      await supertest(app.getHttpServer())
        .post('/org')
        .send({
          name: 123, // Invalid data type for name
          ownerId: 'invalid-owner-id',
        })
        .expect(400);
    });

    it('GET /org - should return the correct response structure', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/org?limit=1')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('ownerId');
    });

    it('POST /org - should ensure the owner ID is valid', async () => {
      await supertest(app.getHttpServer())
        .post('/org')
        .send({
          name: 'company 1',
          ownerId: 'invalid-owner-id', // Invalid owner ID
        })
        .expect(400);
    });

    it('GET /org - should respect the maximum limit of organizations', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/org?limit=100') // Assuming the limit is set to 100
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(100);
    });
  });
});
