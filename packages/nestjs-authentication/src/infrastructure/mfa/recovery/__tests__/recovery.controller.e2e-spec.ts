import supertest from 'supertest';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModuleFixture } from '../../../../__tests__/fixtures/app.module.fixture.js';
import { RecoveryService } from '../../../../application/services/recovery/recovery.service.js';

import { RecoveryController } from './fixtures/recovery.controller.fixture.js';

describe('RecoveryController (e2e)', () => {
  let app: INestApplication;

  const mockRecoveryService = {
    recoverLogin: vi.fn().mockResolvedValue(undefined),
    recoverPassword: vi.fn().mockResolvedValue(undefined),
    validatePasscode: vi.fn(),
    updatePassword: vi.fn(),
    revokeAllUserPasswordRecoveries: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleFixture],
      controllers: [RecoveryController],
    })
      .overrideProvider(RecoveryService)
      .useValue(mockRecoveryService)
      .compile();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/recovery/login', () => {
    it('should return 201 and call recoverLogin', async () => {
      await supertest(app.getHttpServer())
        .post('/auth/recovery/login')
        .send({ email: 'user@example.com' })
        .expect(201);

      expect(mockRecoveryService.recoverLogin).toHaveBeenCalledWith(
        expect.any(Object),
        'user@example.com',
      );
    });
  });

  describe('POST /auth/recovery/password', () => {
    it('should return 201 and call recoverPassword', async () => {
      await supertest(app.getHttpServer())
        .post('/auth/recovery/password')
        .send({ email: 'user@example.com' })
        .expect(201);

      expect(mockRecoveryService.recoverPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'user@example.com',
      );
    });
  });

  describe('GET /auth/recovery/passcode/:passcode', () => {
    it('should return 200 when passcode is valid', async () => {
      mockRecoveryService.validatePasscode.mockResolvedValueOnce({
        assigneeId: 'user-1',
      });

      await supertest(app.getHttpServer())
        .get('/auth/recovery/passcode/valid-passcode')
        .expect(200);
    });

    it('should return 400 when passcode is invalid', async () => {
      mockRecoveryService.validatePasscode.mockResolvedValueOnce(null);

      await supertest(app.getHttpServer())
        .get('/auth/recovery/passcode/bad-passcode')
        .expect(400);
    });
  });

  describe('PATCH /auth/recovery/password', () => {
    it('should return 200 when passcode resolves to a user', async () => {
      mockRecoveryService.updatePassword.mockResolvedValueOnce({
        id: 'user-1',
      });

      await supertest(app.getHttpServer())
        .patch('/auth/recovery/password')
        .send({ passcode: 'valid-passcode', newPassword: 'NewP@ss1234' })
        .expect(200);
    });

    it('should return 400 when passcode is invalid', async () => {
      mockRecoveryService.updatePassword.mockResolvedValueOnce(null);

      await supertest(app.getHttpServer())
        .patch('/auth/recovery/password')
        .send({ passcode: 'bad-passcode', newPassword: 'NewP@ss1234' })
        .expect(400);
    });
  });
});
