import { type AccessControlContextInterface } from '@concepta/nestjs-access-control';

/**
 * A route parameter of the call an access query service is deciding, or
 * `undefined` when it is absent or the call is not HTTP.
 */
export function routeParam(
  context: AccessControlContextInterface,
  name: string,
): string | undefined {
  const params: unknown = context.getRequest('params');
  const value: unknown =
    typeof params === 'object' && params !== null
      ? Reflect.get(params, name)
      : undefined;

  return typeof value === 'string' ? value : undefined;
}
