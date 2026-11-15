/** The methods that only read; every other one may write. */
const READ_METHODS: ReadonlySet<string> = new Set([
  'GET',
  'HEAD',
  'OPTIONS',
  'SEARCH',
  'PROPFIND',
  'QUERY',
]);

/**
 * Whether a route's method only reads: `GET`, `HEAD`, `OPTIONS`, `SEARCH`,
 * `PROPFIND` or `QUERY`. Every other one may write, `ALL` included. Takes
 * the uppercase name an audited route's `method` holds; any other spelling
 * counts as a write.
 *
 * @example
 * ```ts
 * routes.filter((route) => !isReadMethod(route.method));
 * ```
 */
export function isReadMethod(method: string): boolean {
  return READ_METHODS.has(method);
}
