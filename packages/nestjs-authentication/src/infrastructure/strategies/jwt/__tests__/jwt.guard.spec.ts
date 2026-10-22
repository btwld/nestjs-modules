import { randomUUID } from 'crypto';

import { type MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { type ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { type ReferenceIdInterface } from '@concepta/nestjs-core';

import { JwtUnauthorizedException } from '../exceptions/jwt-unauthorized.exception.js';
import { JwtGuard } from '../jwt.guard.js';

import { UserModuleFixture } from './fixtures/user.module.fixture.js';

describe(JwtGuard, () => {
  let context: ExecutionContext;
  let jwtGuard: JwtGuard;
  let spyCanActivate: MockInstance;
  let user: ReferenceIdInterface;

  beforeEach(async () => {
    context = mock<ExecutionContext>();

    const moduleRef = await Test.createTestingModule({
      imports: [UserModuleFixture],
    }).compile();
    jwtGuard = moduleRef.get<JwtGuard>(JwtGuard);
    spyCanActivate = vi
      .spyOn(JwtGuard.prototype, 'canActivate')
      .mockImplementation(() => true);
    user = { id: randomUUID() };
  });

  describe(JwtGuard.prototype.canActivate, () => {
    it('should be success', async () => {
      await jwtGuard.canActivate(context);
      expect(spyCanActivate).toHaveBeenCalled();
      expect(spyCanActivate).toHaveBeenCalledWith(context);
    });
  });

  describe(JwtGuard.prototype.handleRequest, () => {
    it('should return user', () => {
      const response = jwtGuard.handleRequest<ReferenceIdInterface>(
        undefined,
        user,
      );
      expect(response?.id).toBe(user.id);
    });
    it('should throw error', () => {
      const error = new Error();
      const t = () => {
        jwtGuard.handleRequest<ReferenceIdInterface>(error, user);
      };
      expect(t).toThrow();
    });
    it('should throw error unauthorized', () => {
      const t = () => {
        jwtGuard.handleRequest(undefined, undefined);
      };
      expect(t).toThrow(JwtUnauthorizedException);
    });
  });
});
