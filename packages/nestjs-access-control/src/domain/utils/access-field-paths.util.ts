/**
 * A value as it goes over the wire: its `toJSON()` result when it has one,
 * as `JSON.stringify` would send it.
 */
export function toWire(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const toJSON: unknown = Reflect.get(value, 'toJSON');

  return typeof toJSON === 'function'
    ? Reflect.apply(toJSON, value, [])
    : value;
}

/**
 * A value's fields as they go over the wire, or `undefined` when it has
 * none to filter (not an object, or an array). Class instances count, so a
 * route returning one is filtered like a plain object.
 */
export function toWireRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  const wire = toWire(value);

  if (typeof wire !== 'object' || wire === null || Array.isArray(wire)) {
    return undefined;
  }

  return Object.fromEntries(Object.entries(wire));
}

/**
 * A value's items as they go over the wire, or `undefined` when it is not
 * an array.
 */
export function toWireArray(value: unknown): unknown[] | undefined {
  const wire = toWire(value);

  return Array.isArray(wire) ? wire : undefined;
}

/**
 * A field path without array positions: `items.0.amount` becomes
 * `items.amount`, so a rule on `items.amount` covers every item.
 *
 * A path of positions alone, such as a top-level key `0`, is kept as it
 * is: the empty path would stand for the resource as a whole, and rules
 * never name positions, so only a rule covering every field matches it.
 */
export function normalizeAccessFieldPath(path: string): string {
  const normalized = path
    .split('.')
    .filter((segment) => !/^\d+$/.test(segment))
    .join('.');

  return normalized || path;
}

/**
 * Every leaf field path in a value, without array positions, such as the
 * fields a write body touches. An empty object or array counts as a leaf.
 */
export function accessFieldPaths(value: unknown): string[] {
  const paths = new Set<string>();

  const walk = (node: unknown, prefix: string): void => {
    const items = toWireArray(node);
    const record = items ? undefined : toWireRecord(node);
    const children: [string, unknown][] = items
      ? items.map((item): [string, unknown] => [prefix, item])
      : Object.entries(record ?? {}).map(([key, child]): [string, unknown] => [
          prefix ? `${prefix}.${key}` : key,
          child,
        ]);

    if (!children.length) {
      if (prefix) {
        paths.add(prefix);
      }
      return;
    }

    for (const [path, child] of children) {
      walk(child, path);
    }
  };

  walk(value, '');

  return [...paths];
}
