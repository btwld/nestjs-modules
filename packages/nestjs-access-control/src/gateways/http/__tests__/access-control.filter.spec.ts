import { lastValueFrom, of } from 'rxjs';
import { mock } from 'vitest-mock-extended';

import { type CallHandler, type ExecutionContext } from '@nestjs/common';

import { AccessControlFilter } from '../access-control.filter.js';

describe(AccessControlFilter.name, () => {
  it('passes a response through when the call has no context', async () => {
    const context = mock<ExecutionContext>();
    context.getType.mockReturnValue('ws');
    const data = { id: 1, secret: 's' };
    const next: CallHandler = { handle: () => of(data) };

    expect(
      await lastValueFrom(new AccessControlFilter().intercept(context, next)),
    ).toBe(data);
  });
});
