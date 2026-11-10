/**
 * The header `DemoAuthGuard` signs a user in with.
 */
export const bearer = (user: string) => ({ Authorization: `Bearer ${user}` });

/**
 * The body of a refused call, such as `refused('read:any on invoice (no-grant)')`.
 */
export const refused = (detail: string) => ({
  statusCode: 403,
  error: 'Forbidden',
  errorCode: 'ACCESS_REFUSED_ERROR',
  message: `Access refused: ${detail}`,
});
