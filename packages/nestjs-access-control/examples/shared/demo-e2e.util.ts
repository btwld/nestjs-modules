import { type Response } from 'supertest';

import { BaseExceptionFilter } from '@nestjs/core';

import {
  type AccessRefusal,
  AccessRefusedException,
} from '@concepta/nestjs-access-control';

/** Every exception the application rendered, newest last. */
const rendered = vi.spyOn(BaseExceptionFilter.prototype, 'catch');

/**
 * The header `DemoAuthGuard` signs a user in with.
 */
export const bearer = (user: string) => ({ Authorization: `Bearer ${user}` });

/**
 * Asserts a refused call, such as `refused('read', 'invoice', 'no-grant')`:
 * the body names the action and the resource, and the exception it was
 * rendered from carries why in its context, which the body never shows.
 */
export const refused =
  (action: string, resource: string, refusal: AccessRefusal) =>
  (response: Response) => {
    expect(response.body).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      errorCode: 'ACCESS_REFUSED_ERROR',
      message: `Not allowed to ${action} ${resource}`,
    });

    const [exception] = rendered.mock.calls.at(-1) ?? [];
    expect(
      exception instanceof AccessRefusedException && exception.context.refusal,
    ).toEqual(refusal);
  };
