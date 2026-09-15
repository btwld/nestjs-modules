import { mock } from 'vitest-mock-extended';

import { type ArgumentsHost, type ExecutionContext } from '@nestjs/common';

import {
  CorrelationContextOverlay,
  CorrelationCtx,
} from '../correlation-context.overlay.js';
import { getAppContext } from '../get-app-context.util.js';

type HttpArgumentsHost = ReturnType<ArgumentsHost['switchToHttp']>;

const makeCtx = (request: object): ExecutionContext => {
  const httpArgsHost = mock<HttpArgumentsHost>();
  httpArgsHost.getRequest.mockReturnValue(request);
  const ctx = mock<ExecutionContext>();
  ctx.switchToHttp.mockReturnValue(httpArgsHost);
  return ctx;
};

describe(CorrelationContextOverlay.name, () => {
  let overlay: CorrelationContextOverlay;

  beforeEach(() => {
    overlay = new CorrelationContextOverlay();
  });

  it('should seed correlationId/causationId from the x-correlation-id header', () => {
    const request = { headers: { 'x-correlation-id': 'req-corr-1' } };
    overlay.attach(makeCtx(request));

    expect(getAppContext(request).with(CorrelationCtx)).toEqual({
      correlationId: 'req-corr-1',
      causationId: 'req-corr-1',
    });
  });

  it('should mint a fresh self-correlated pair when no header is present', () => {
    const request = { headers: {} };
    overlay.attach(makeCtx(request));

    const { correlationId, causationId } =
      getAppContext(request).with(CorrelationCtx);
    expect(correlationId).toBe(causationId);
    expect(correlationId).toEqual(expect.any(String));
  });

  it('should be idempotent when attached twice', () => {
    const request = { headers: { 'x-correlation-id': 'req-corr-1' } };
    overlay.attach(makeCtx(request));
    request.headers['x-correlation-id'] = 'req-corr-2';
    overlay.attach(makeCtx(request));

    expect(getAppContext(request).with(CorrelationCtx).correlationId).toBe(
      'req-corr-1',
    );
  });
});
