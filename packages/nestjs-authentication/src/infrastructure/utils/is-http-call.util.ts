import { type ExecutionContext } from '@nestjs/common';

/**
 * Whether the call is HTTP, the only transport this module's guards read a
 * request from: on any other, what the call carries is the caller's own
 * payload.
 */
export function isHttpCall(context: ExecutionContext): boolean {
  return context.getType() === 'http';
}
