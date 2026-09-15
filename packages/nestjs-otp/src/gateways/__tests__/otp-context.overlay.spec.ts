import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { type ExecutionContext } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';

import { getAppContext } from '@concepta/nestjs-core';

import { OtpCtx, OtpContextOverlay } from '../otp-context.overlay.js';

describe('OtpContextOverlay', () => {
  let reflector: DeepMockProxy<Reflector>;
  let overlay: OtpContextOverlay;
  let mockContext: ExecutionContext;
  let mockRequest: Record<string | symbol, unknown>;

  beforeEach(() => {
    reflector = mockDeep<Reflector>();

    overlay = new OtpContextOverlay(reflector);

    mockRequest = {};
    const handler = vi.fn();
    const target = class TestController {};
    mockContext = {
      getHandler: () => handler,
      getClass: () => target,
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;
  });

  it('should have ref name "withOtp"', () => {
    expect(overlay.ref.name).toBe('withOtp');
  });

  it('should resolve namespace from decorator metadata via attach', () => {
    reflector.getAllAndOverride.mockReturnValue({ name: 'userOtp' });

    overlay.attach(mockContext);

    const ctx = getAppContext(mockRequest);
    const result = ctx.with(OtpCtx);

    expect(result).toEqual({ namespace: 'userOtp' });
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('OTP_NAMESPACE', [
      mockContext.getHandler(),
      mockContext.getClass(),
    ]);
  });

  it('should return empty namespace when no decorator metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    overlay.attach(mockContext);

    const ctx = getAppContext(mockRequest);
    const result = ctx.with(OtpCtx);

    expect(result).toEqual({ namespace: '' });
  });
});
