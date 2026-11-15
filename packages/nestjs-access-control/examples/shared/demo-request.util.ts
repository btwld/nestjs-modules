import { type ExecutionContext } from '@nestjs/common';

import { type DemoRequestInterface } from './demo-request.interface.js';

/**
 * The HTTP request of a call, or `undefined` when the call is not HTTP.
 * Actor resolvers receive an execution context only for HTTP calls.
 */
export function demoRequestOf(
  context?: ExecutionContext,
): DemoRequestInterface | undefined {
  return context?.switchToHttp().getRequest<DemoRequestInterface>();
}
