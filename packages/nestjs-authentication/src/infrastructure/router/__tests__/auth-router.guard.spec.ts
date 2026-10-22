import { mock } from 'vitest-mock-extended';

import {
  type ArgumentsHost,
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AuthRouterGuards } from '../auth-router.constants.js';
import { AuthRouterGuard } from '../auth-router.guard.js';
import { AuthRouterAuthenticationFailedException } from '../exceptions/auth-router-authentication-failed.exception.js';
import { AuthRouterConfigNotAvailableException } from '../exceptions/auth-router-config-not-available.exception.js';
import { AuthRouterGuardInvalidException } from '../exceptions/auth-router-guard-invalid.exception.js';
import { AuthRouterProviderMissingException } from '../exceptions/auth-router-provider-missing.exception.js';
import { AuthRouterProviderNotSupportedException } from '../exceptions/auth-router-provider-not-supported.exception.js';

type HttpArgumentsHost = ReturnType<ArgumentsHost['switchToHttp']>;

// Mock guard classes for testing
class MockSuccessGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

class MockFailureGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false;
  }
}

class MockAsyncSuccessGuard implements CanActivate {
  canActivate(_context: ExecutionContext): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class MockErrorGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    throw new Error('Mock guard error');
  }
}

class MockAsyncErrorGuard implements CanActivate {
  canActivate(_context: ExecutionContext): Promise<boolean> {
    return Promise.reject(new Error('Mock async guard error'));
  }
}

class MockHttpExceptionGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    throw new UnauthorizedException('bad credentials');
  }
}

describe(AuthRouterGuard.name, () => {
  let guard: AuthRouterGuard;
  let mockExecutionContext: ExecutionContext;
  let mockAuthRouterGuards: Record<string, CanActivate>;

  const createMockExecutionContext = (provider?: string): ExecutionContext => {
    const mockRequest = { query: { provider } };
    const httpArgsHost = mock<HttpArgumentsHost>();
    httpArgsHost.getRequest.mockReturnValue(mockRequest);
    const ctx = mock<ExecutionContext>();
    ctx.switchToHttp.mockReturnValue(httpArgsHost);
    return ctx;
  };

  beforeEach(async () => {
    mockAuthRouterGuards = {
      google: new MockSuccessGuard(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRouterGuard,
        {
          provide: AuthRouterGuards,
          useValue: mockAuthRouterGuards,
        },
      ],
    }).compile();

    guard = module.get<AuthRouterGuard>(AuthRouterGuard);
  });

  describe('Guard Instance', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should be an instance of AuthRouter', () => {
      expect(guard).toBeInstanceOf(AuthRouterGuard);
    });
  });

  describe('canActivate - Provider Validation', () => {
    it('should throw AuthRouterProviderMissingException when provider is missing', async () => {
      mockExecutionContext = createMockExecutionContext();

      await expect(
        guard.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterProviderMissingException);
    });

    it('should throw AuthRouterProviderMissingException when provider is empty string', async () => {
      mockExecutionContext = createMockExecutionContext('');

      await expect(
        guard.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterProviderMissingException);
    });

    it('should throw AuthRouterProviderMissingException when provider is null', async () => {
      mockExecutionContext = createMockExecutionContext(
        null as unknown as string,
      );

      await expect(
        guard.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterProviderMissingException);
    });

    it('should throw AuthRouterProviderMissingException when provider is undefined', async () => {
      mockExecutionContext = createMockExecutionContext(undefined);

      await expect(
        guard.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterProviderMissingException);
    });
  });

  describe('canActivate - Guards Configuration Validation', () => {
    it('should throw AuthRouterConfigNotAvailableException when guards record is not found', async () => {
      mockExecutionContext = createMockExecutionContext('google');

      const guardWithoutGuards = new AuthRouterGuard(
        null as unknown as Record<string, CanActivate>,
      );

      await expect(
        guardWithoutGuards.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterConfigNotAvailableException);
    });

    it('should throw AuthRouterConfigNotAvailableException when guards record is undefined', async () => {
      mockExecutionContext = createMockExecutionContext('google');

      const guardWithUndefinedGuards = new AuthRouterGuard(
        undefined as unknown as Record<string, CanActivate>,
      );

      await expect(
        guardWithUndefinedGuards.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterConfigNotAvailableException);
    });

    it('should throw AuthRouterConfigNotAvailableException when guards record is not an object', async () => {
      mockExecutionContext = createMockExecutionContext('google');

      const guardWithInvalidGuards = new AuthRouterGuard(
        'not an object' as unknown as Record<string, CanActivate>,
      );

      await expect(
        guardWithInvalidGuards.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterConfigNotAvailableException);
    });
  });

  describe('canActivate - Provider Support Validation', () => {
    it('should throw AuthRouterProviderNotSupportedException when provider is not in guards record', async () => {
      mockExecutionContext = createMockExecutionContext('unsupported');
      mockAuthRouterGuards = {
        google: new MockSuccessGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);

      await expect(
        guardWithGuards.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterProviderNotSupportedException);
    });

    it('should throw AuthRouterProviderNotSupportedException with correct provider name', async () => {
      mockExecutionContext = createMockExecutionContext('facebook');
      mockAuthRouterGuards = {
        google: new MockSuccessGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);
      const call = guardWithGuards.canActivate(mockExecutionContext);

      await expect(call).rejects.toBeInstanceOf(
        AuthRouterProviderNotSupportedException,
      );
      await expect(call).rejects.toMatchObject({
        safeMessage: expect.stringContaining('facebook'),
      });
    });
  });

  describe('canActivate - Guard Instance Validation', () => {
    it('should throw AuthRouterGuardInvalidException when guard instance canActivate is not a function', async () => {
      mockExecutionContext = createMockExecutionContext('google');
      mockAuthRouterGuards = {
        google: {
          canActivate: 'not a function',
        } as unknown as CanActivate,
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);

      await expect(
        guardWithGuards.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterGuardInvalidException);
    });
  });

  describe('canActivate - Guard Execution Success Cases', () => {
    it('should return true when guard returns boolean true', async () => {
      mockExecutionContext = createMockExecutionContext('google');
      mockAuthRouterGuards = {
        google: new MockSuccessGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);
      const result = await guardWithGuards.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should return false when guard returns boolean false', async () => {
      mockExecutionContext = createMockExecutionContext('google');
      mockAuthRouterGuards = {
        google: new MockFailureGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);
      const result = await guardWithGuards.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should return true when guard returns Promise<true>', async () => {
      mockExecutionContext = createMockExecutionContext('google');
      mockAuthRouterGuards = {
        google: new MockAsyncSuccessGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);
      const result = await guardWithGuards.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });

  describe('canActivate - Guard Execution Error Cases', () => {
    it('should throw AuthRouterAuthenticationFailedException when guard throws error', async () => {
      mockExecutionContext = createMockExecutionContext('google');
      mockAuthRouterGuards = {
        google: new MockErrorGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);

      await expect(
        guardWithGuards.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterAuthenticationFailedException);
    });

    it('should throw AuthRouterAuthenticationFailedException when async guard throws error', async () => {
      mockExecutionContext = createMockExecutionContext('google');
      mockAuthRouterGuards = {
        google: new MockAsyncErrorGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);

      await expect(
        guardWithGuards.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterAuthenticationFailedException);
    });

    it('should include provider name in AuthRouterAuthenticationFailedException', async () => {
      mockExecutionContext = createMockExecutionContext('github');
      mockAuthRouterGuards = {
        github: new MockErrorGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);
      const call = guardWithGuards.canActivate(mockExecutionContext);

      await expect(call).rejects.toBeInstanceOf(
        AuthRouterAuthenticationFailedException,
      );
      await expect(call).rejects.toMatchObject({
        safeMessage: expect.stringMatching(/github.*Mock guard error/),
      });
    });

    it('should handle unknown error types in AuthRouterAuthenticationFailedException', async () => {
      mockExecutionContext = createMockExecutionContext('google');
      mockAuthRouterGuards = {
        google: {
          canActivate: () => {
            throw 'String error';
          },
        } as unknown as CanActivate,
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);
      const call = guardWithGuards.canActivate(mockExecutionContext);

      await expect(call).rejects.toBeInstanceOf(
        AuthRouterAuthenticationFailedException,
      );
      await expect(call).rejects.toMatchObject({
        safeMessage: expect.stringContaining('Unknown error'),
      });
    });

    it('should classify a wrapped unexpected error as internal/500, not client/401', async () => {
      mockExecutionContext = createMockExecutionContext('google');
      mockAuthRouterGuards = {
        google: new MockErrorGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);

      try {
        await guardWithGuards.canActivate(mockExecutionContext);
        throw new Error('Expected AuthRouterAuthenticationFailedException');
      } catch (e) {
        expect(e).toBeInstanceOf(AuthRouterAuthenticationFailedException);
        expect((e as AuthRouterAuthenticationFailedException).httpStatus).toBe(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect((e as AuthRouterAuthenticationFailedException).fault).toBe(
          'internal',
        );
      }
    });

    it('should pass through an HttpException thrown by the delegated guard unwrapped', async () => {
      mockExecutionContext = createMockExecutionContext('google');
      mockAuthRouterGuards = {
        google: new MockHttpExceptionGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);

      await expect(
        guardWithGuards.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('canActivate - Exception Re-throwing', () => {
    it('should re-throw AuthRouterProviderMissingException without wrapping', async () => {
      mockExecutionContext = createMockExecutionContext();

      await expect(
        guard.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterProviderMissingException);
    });

    it('should re-throw AuthRouterConfigNotAvailableException without wrapping', async () => {
      mockExecutionContext = createMockExecutionContext('google');

      const guardWithoutGuards = new AuthRouterGuard(
        null as unknown as Record<string, CanActivate>,
      );

      await expect(
        guardWithoutGuards.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterConfigNotAvailableException);
    });

    it('should re-throw AuthRouterProviderNotSupportedException without wrapping', async () => {
      mockExecutionContext = createMockExecutionContext('unsupported');
      mockAuthRouterGuards = {
        google: new MockSuccessGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);

      await expect(
        guardWithGuards.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterProviderNotSupportedException);
    });

    it('should re-throw AuthRouterGuardInvalidException without wrapping', async () => {
      mockExecutionContext = createMockExecutionContext('google');
      mockAuthRouterGuards = {
        google: {
          canActivate: 'not a function',
        } as unknown as CanActivate,
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);

      await expect(
        guardWithGuards.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterGuardInvalidException);
    });
  });

  describe('canActivate - Edge Cases', () => {
    it('should handle multiple providers in guards record correctly', async () => {
      mockExecutionContext = createMockExecutionContext('github');
      mockAuthRouterGuards = {
        google: new MockSuccessGuard(),
        github: new MockFailureGuard(),
        facebook: new MockSuccessGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);
      const result = await guardWithGuards.canActivate(mockExecutionContext);

      expect(result).toBe(false); // github guard returns false
    });

    it('should handle provider name case sensitivity', async () => {
      mockExecutionContext = createMockExecutionContext('Google');
      mockAuthRouterGuards = {
        google: new MockSuccessGuard(),
      };

      const guardWithGuards = new AuthRouterGuard(mockAuthRouterGuards);

      await expect(
        guardWithGuards.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterProviderNotSupportedException);
    });

    it('should handle empty provider name', async () => {
      mockExecutionContext = createMockExecutionContext('   ');

      await expect(
        guard.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterProviderMissingException);
    });

    it('should handle whitespace-only provider name', async () => {
      mockExecutionContext = createMockExecutionContext('   ');

      await expect(
        guard.canActivate(mockExecutionContext),
      ).rejects.toBeInstanceOf(AuthRouterProviderMissingException);
    });
  });
});
