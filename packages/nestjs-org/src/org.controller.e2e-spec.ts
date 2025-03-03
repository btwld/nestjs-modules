import supertest from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { CrudModule } from '@concepta/nestjs-crud';
import { SeedingSource } from '@concepta/typeorm-seeding';

import { OrgFactory } from './seeding/org.factory';
import { OrgSeeder } from './seeding/org.seeder';
import { OrgModule } from './org.module';
import { OrgEntityFixture } from './__fixtures__/org-entity.fixture';
import { OwnerEntityFixture } from './__fixtures__/owner-entity.fixture';
import { OwnerLookupServiceFixture } from './__fixtures__/owner-lookup-service.fixture';
import { OwnerModuleFixture } from './__fixtures__/owner.module.fixture';
import { OwnerFactoryFixture } from './__fixtures__/owner-factory.fixture';
import { OrgMemberEntityFixture } from './__fixtures__/org-member.entity.fixture';
import { UserEntityFixture } from './__fixtures__/user-entity.fixture';
import { InvitationEntityFixture } from './__fixtures__/invitation.entity.fixture';
import { OrgProfileEntityFixture } from './__fixtures__/org-profile.entity.fixture';

describe('OrgController (e2e)', () => {
  describe('Rest', () => {
    let app: INestApplication;
    let seedingSource: SeedingSource;

    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmExtModule.forRoot({
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
          OrgModule.registerAsync({
            inject: [OwnerLookupServiceFixture],
            useFactory: (ownerLookupService: OwnerLookupServiceFixture) => ({
              ownerLookupService,
            }),
            entities: {
              org: {
                entity: OrgEntityFixture,
              },
              'org-member': {
                entity: OrgMemberEntityFixture,
              },
            },
          }),
          CrudModule.forRoot({}),
          OwnerModuleFixture.register(),
        ],
        providers: [OwnerLookupServiceFixture],
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
      await supertest(app.getHttpServer())
        .get(`/org/${response.body[0].id}`)
        .expect(200);
    });

    it('POST /org', async () => {
      const ownerFactory = new OwnerFactoryFixture({ seedingSource });
      const owner = await ownerFactory.create();

      await supertest(app.getHttpServer())
        .post('/org')
        .send({
          name: 'company 1',
          owner,
        })
        .expect(201);
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
  });
});
