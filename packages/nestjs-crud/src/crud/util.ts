export function safeRequire<T = unknown>(
  path: string,
  loader?: () => T,
): T | null {
  try {
    /* istanbul ignore next */
    const pack = loader ? loader() : require(path);
    return pack;
  } catch (_) {
    /* istanbul ignore next */
    return null;
  }
}
