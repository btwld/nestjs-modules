import { randomUUID } from 'crypto';

import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { SeedingSource } from '@concepta/typeorm-seeding';

import { type InvitationAcceptableInterface } from '../../../domain/interfaces/invitation-acceptable.interface.js';
import { type InvitationCreatableInterface } from '../../../domain/interfaces/invitation-creatable.interface.js';
import { InvitationOtpPort } from '../../../domain/ports/invitation-otp.port.js';
import { type InvitationEntityInterface } from '../../../infrastructure/persistence/interfaces/invitation-entity.interface.js';
import { InvitationFactory } from '../../../infrastructure/seeding/invitation.factory.js';

import { AppCrudModuleFixture } from './fixtures/app-crud.module.fixture.js';
import { InvitationEntityFixture } from './fixtures/entities/invitation.entity.fixture.js';
import { UserEntityFixture } from './fixtures/entities/user.entity.fixture.js';

describe('InvitationController (e2e)', () => {
  const userCategory = 'user';
  const orgCategory = 'org';
  const constraints = { moreData: 'foo' };

  let app: INestApplication;
  let invitationFactory: InvitationFactory;
  let seedingSource: SeedingSource;
  let user: UserEntityFixture;
  let otpPort: InvitationOtpPort;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppCrudModuleFixture],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    otpPort = moduleFixture.get<InvitationOtpPort>(InvitationOtpPort);

    seedingSource = new SeedingSource({
      dataSource: moduleFixture.get(getDataSourceToken()),
    });

    await seedingSource.initialize();

    invitationFactory = new InvitationFactory({
      entity: InvitationEntityFixture,
      seedingSource,
    });

    // Seed a user directly via TypeORM
    const dataSource = moduleFixture.get(getDataSourceToken());
    const userRepo = dataSource.getRepository(UserEntityFixture);
    user = await userRepo.save(
      userRepo.create({
        email: `test-${Date.now()}@example.com`,
        username: `testuser-${Date.now()}`,
        active: true,
      }),
    );
  });

  afterEach(async () => {
    vi.clearAllMocks();
    if (app) await app.close();
  });

  describe('Type: org', () => {
    let invitation: InvitationEntityInterface;

    beforeEach(async () => {
      invitation = await invitationFactory.create({
        category: orgCategory,
        userId: user.id,
      });
    });

    it('POST /invitation', async () => {
      await createInvitation(app, {
        category: orgCategory,
        userId: user.id,
        code: randomUUID(),
        constraints,
      });
    });

    it('PATCH /invitation-acceptance/:code', async () => {
      const { code } = invitation;
      const otp = await otpPort.create({}, orgCategory, user.id);

      const body: InvitationAcceptableInterface = {
        passcode: otp.passcode,
        payload: { newPassword: 'hOdv2A2h%' },
      };

      await supertest(app.getHttpServer())
        .patch(`/invitation-acceptance/${code}`)
        .send(body)
        .expect(200);
    });

    it('PATCH /invitation-acceptance/:code (wrong passcode is a 400)', async () => {
      const { code } = invitation;
      await otpPort.create({}, orgCategory, user.id);

      const body: InvitationAcceptableInterface = {
        passcode: 'wrong-passcode',
        payload: { newPassword: 'hOdv2A2h%' },
      };

      await supertest(app.getHttpServer())
        .patch(`/invitation-acceptance/${code}`)
        .send(body)
        .expect(400);
    });
  });

  describe('Type: user', () => {
    let invitation: InvitationEntityInterface;

    beforeEach(async () => {
      invitation = await invitationFactory.create({
        category: userCategory,
        userId: user.id,
      });
    });

    it('POST /invitation', async () => {
      await createInvitation(app, {
        category: userCategory,
        userId: user.id,
        code: randomUUID(),
        constraints,
      });
    });

    it('PATCH /invitation-acceptance/:code', async () => {
      const { code } = invitation;
      const otp = await otpPort.create({}, userCategory, user.id);

      const body: InvitationAcceptableInterface = {
        passcode: otp.passcode,
        payload: { newPassword: 'hOdv2A2h%' },
      };

      await supertest(app.getHttpServer())
        .patch(`/invitation-acceptance/${code}`)
        .send(body)
        .expect(200);
    });

    // Regression: the acceptance controller uses a bare `@CrudBody()` and
    // relies on the operation decorator's `request.body` schema to wire
    // validation — an invalid payload must 400, not reach the handler.
    it('PATCH /invitation-acceptance/:code (invalid body is rejected)', async () => {
      const { code } = invitation;

      const response = await supertest(app.getHttpServer())
        .patch(`/invitation-acceptance/${code}`)
        .send({ payload: { newPassword: 'hOdv2A2h%' } })
        .expect(400);

      expect(response.body.message).toEqual([
        expect.stringContaining('passcode'),
      ]);
    });

    it('GET /invitation', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/invitation')
        .expect(200);

      const invitationResponse: InvitationEntityInterface[] =
        response.body.data;

      expect(invitationResponse.length).toEqual(1);
    });

    // regression: the seeded invitation never sets `constraints`, so the
    // persisted (nullable) column reads back as `null`, not `undefined` —
    // the response schema must accept `null` here or the fail-closed
    // serializer 500s on every list/read of a constraints-less invitation.
    it('GET /invitation (constraints column is null, not undefined)', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/invitation')
        .expect(200);

      const invitationResponse: InvitationEntityInterface[] =
        response.body.data;

      expect(invitationResponse[0]?.constraints).toBeNull();
    });

    it('GET /invitation/:id', async () => {
      const created = await createInvitation(app, {
        category: userCategory,
        userId: user.id,
        code: randomUUID(),
        constraints,
      });

      const response = await supertest(app.getHttpServer())
        .get(`/invitation/${created.id}`)
        .expect(200);

      const invitationResponse: InvitationEntityInterface = response.body;
      expect(invitationResponse.category).toEqual(userCategory);
    });

    it('DELETE /invitation/:id', async () => {
      const created = await createInvitation(app, {
        category: userCategory,
        userId: user.id,
        code: randomUUID(),
        constraints,
      });

      await supertest(app.getHttpServer())
        .delete(`/invitation/${created.id}`)
        .expect(204);

      await supertest(app.getHttpServer())
        .get(`/invitation/${created.id}`)
        .expect(404);
    });
  });
});

const createInvitation = async (
  app: INestApplication,
  dto: InvitationCreatableInterface,
): Promise<InvitationEntityInterface> => {
  const response = await supertest(app.getHttpServer())
    .post('/invitation')
    .send(dto)
    .expect(201);

  const invitation: InvitationEntityInterface = response.body;
  return invitation;
};
